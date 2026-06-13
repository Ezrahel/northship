import { existsSync, statSync } from "node:fs";
import { join, relative, resolve, isAbsolute } from "node:path";
import type { Service } from "./schema.js";

export const serviceBuildMethods = ["auto", "railpack", "dockerfile"] as const;
export type ServiceBuildMethod = (typeof serviceBuildMethods)[number];
export type DetectedBuildMethod = "railpack" | "dockerfile";

// Mirrors Railway's RAILWAY_DOCKERFILE_PATH escape hatch.
export const DOCKERFILE_PATH_ENV_KEY = "NORTHSHIP_DOCKERFILE_PATH";

export function normalizeServiceBuildMethod(value: string | null | undefined): ServiceBuildMethod {
  return value === "railpack" || value === "dockerfile" ? value : "auto";
}

export type DockerfileDetection = {
  method: DetectedBuildMethod;
  /** Absolute path to the Dockerfile when method is "dockerfile". */
  dockerfilePath: string | null;
  /** Dockerfile path relative to the app directory, for logs and the UI. */
  dockerfileRelativePath: string;
  /** Non-fatal notes to surface in the deployment log. */
  warnings: string[];
};

function isFile(path: string) {
  try {
    return statSync(path).isFile();
  } catch {
    return false;
  }
}

/**
 * Decides whether a deployment should build with the repo's Dockerfile or
 * fall through to Railpack. A Dockerfile at the app root wins by default
 * (matching Railway), unless the service explicitly pins Railpack.
 */
export function detectDockerfileBuild(options: {
  service: Pick<Service, "buildMethod" | "dockerfilePath">;
  appDir: string;
  env: Record<string, string>;
}): DockerfileDetection {
  const { service, appDir, env } = options;
  const warnings: string[] = [];
  const method = normalizeServiceBuildMethod(service.buildMethod);
  const customPath = (env[DOCKERFILE_PATH_ENV_KEY] ?? service.dockerfilePath ?? "").trim();
  const relativePath = customPath || "Dockerfile";

  const railpack = (extraWarnings: string[] = []): DockerfileDetection => ({
    method: "railpack",
    dockerfilePath: null,
    dockerfileRelativePath: relativePath,
    warnings: [...warnings, ...extraWarnings]
  });

  if (method === "railpack") {
    if (customPath || existsSync(join(appDir, "Dockerfile"))) {
      warnings.push("A Dockerfile is present, but this service is pinned to Railpack. Set the build method to Auto or Dockerfile to use it.");
    }
    return railpack();
  }

  if (isAbsolute(relativePath)) {
    if (method === "dockerfile") {
      throw new Error(`Dockerfile path must be relative to the repository, got: ${relativePath}`);
    }
    return railpack([`Ignoring absolute Dockerfile path ${relativePath}; using Railpack instead.`]);
  }

  const resolvedPath = resolve(appDir, relativePath);
  const escapesAppDir = relative(resolve(appDir), resolvedPath).startsWith("..");
  if (escapesAppDir) {
    if (method === "dockerfile") {
      throw new Error(`Dockerfile path ${relativePath} points outside the repository.`);
    }
    return railpack([`Ignoring Dockerfile path ${relativePath} because it points outside the repository; using Railpack instead.`]);
  }

  if (!isFile(resolvedPath)) {
    if (method === "dockerfile") {
      throw new Error(`Build method is set to Dockerfile, but ${relativePath} was not found in the repository.`);
    }
    if (customPath) {
      return railpack([`Custom Dockerfile path ${customPath} was not found; falling back to Railpack.`]);
    }
    return railpack();
  }

  return { method: "dockerfile", dockerfilePath: resolvedPath, dockerfileRelativePath: relativePath, warnings };
}

export function dockerBuildArgs(imageTag: string, dockerfilePath: string, buildEnv: Record<string, string>, contextDir: string) {
  const args = ["build", "--tag", imageTag, "--file", dockerfilePath, "--progress", "plain"];
  // Match Railway: service variables are offered as build args, but only
  // take effect when the Dockerfile declares a matching ARG.
  for (const [key, value] of Object.entries(buildEnv)) {
    args.push("--build-arg", `${key}=${value}`);
  }
  args.push(contextDir);
  return args;
}
