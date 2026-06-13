import { UserAdd01Icon } from "@hugeicons/core-free-icons";
import { FormEvent, useState } from "react";
import { AppIcon, FieldLabel, FormInput, shellButton } from "../ui/primitives";

type UserCreateFormProps = {
  creating: boolean;
  onCreate: (input: { email: string; password: string }) => Promise<void>;
};

export function UserCreateForm({ creating, onCreate }: UserCreateFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");

    const nextEmail = email.trim().toLowerCase();
    if (!nextEmail) {
      setError("Email is required");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    try {
      await onCreate({ email: nextEmail, password });
      setEmail("");
      setPassword("");
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : "Could not create user");
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <div>
        <FieldLabel>Email</FieldLabel>
        <FormInput
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="teammate@example.com"
          disabled={creating}
          autoComplete="email"
        />
      </div>

      <div>
        <FieldLabel>Password</FieldLabel>
        <FormInput
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="At least 8 characters"
          disabled={creating}
          autoComplete="new-password"
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" className={shellButton("primary")} disabled={creating}>
          <AppIcon icon={UserAdd01Icon} size={15} />
          {creating ? "Adding..." : "Add user"}
        </button>
        {error ? <span className="font-mono text-[10px] text-rose-300">{error}</span> : null}
      </div>
    </form>
  );
}
