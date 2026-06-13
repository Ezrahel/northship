import type { ProjectGroup, Service } from "./schema.js";

export function projectActivityTimestamp(project: ProjectGroup, projectServices: Service[]) {
  const timestamps = [
    project.updatedAt,
    ...projectServices.map((service) => service.lastDeployedAt ?? service.updatedAt)
  ];

  return timestamps.sort().at(-1) ?? project.updatedAt;
}

export function sortProjectsByRecentActivity<T extends { lastUpdatedAt: string }>(projects: T[]) {
  return [...projects].sort((a, b) => b.lastUpdatedAt.localeCompare(a.lastUpdatedAt));
}
