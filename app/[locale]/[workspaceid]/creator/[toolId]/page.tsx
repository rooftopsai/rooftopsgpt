// app/[locale]/[workspaceid]/creator/[toolId]/page.tsx
"use client";

import { useParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toolSchemas } from "@/lib/creatorSchemas";
import { supabase } from "@/lib/supabase/browser-client";

export default function ToolPage() {
  // grab exactly the params Next gives us
  const { locale, workspaceid: workspaceId, toolId } =
    useParams() as {
      locale: string;
      workspaceid: string;
      toolId: string;
    };

  // find our tool's schema
  const schema = toolSchemas[toolId];

  // build initial empty values object
  const initialState: Record<string, any> = schema ? Object.fromEntries(
    schema.fields.map((f) => [f.name, ""])
  ) : {};
  const [values, setValues] = useState<Record<string, any>>(initialState);

  // localStorage key for "recent inputs"
  const storageKey = `recent-tool-inputs:${workspaceId}:${toolId}`;
  const router = useRouter();

  // hydrate from localStorage once
  useEffect(() => {
    if (!schema) return;
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        setValues(JSON.parse(saved));
      } catch {}
    }
  }, [storageKey, schema]);

  // save whenever values change
  useEffect(() => {
    if (!schema) return;
    localStorage.setItem(storageKey, JSON.stringify(values));
  }, [values, storageKey, schema]);

  if (!schema) {
    return <p className="p-6">Unknown tool: {toolId}</p>;
  }
  const handleChange = (name: string, val: any) =>
    setValues((prev) => ({ ...prev, [name]: val }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const prompt = schema.buildPrompt(values);
    router.push(
      `/${locale}/${workspaceId}/chat?initialPrompt=${encodeURIComponent(
        prompt
      )}`
    );
  };

  const handleSaveAsTemplate = async () => {
    const name = window.prompt("Template name:");
    if (!name) return;
    const prompt = schema.buildPrompt(values);
    const { error } = await supabase.from("presets").insert([
      {
        workspace_id: workspaceId,
        name,
        prompt,
        model: "",
        temperature: 0.5,
        include_profile_context: false,
        include_workspace_instructions: false,
      },
    ]);
    if (error) {
      console.error(error);
      return alert("Failed to save template.");
    }
    alert("Template saved!");
  };

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-2xl font-bold">{schema.title}</h1>
      <p className="text-gray-600">{schema.description}</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        {schema.fields.map((field) => (
          <div key={field.name}>
            <label className="mb-1 block font-medium">{field.label}</label>

            {field.type === "text" && (
              <Input
                value={values[field.name]}
                onChange={(e) => handleChange(field.name, e.target.value)}
              />
            )}
            {field.type === "number" && (
              <Input
                type="number"
                value={values[field.name]}
                onChange={(e) => handleChange(field.name, e.target.value)}
              />
            )}
            {field.type === "date" && (
              <Input
                type="date"
                value={values[field.name]}
                onChange={(e) => handleChange(field.name, e.target.value)}
              />
            )}
            {field.type === "textarea" && (
              <Textarea
                className="h-24"
                value={values[field.name]}
                onChange={(e) =>
                  handleChange(field.name, e.currentTarget.value)
                }
              />
            )}
            {field.type === "select" && (
              <select
                className="w-full rounded border px-2 py-1"
                value={values[field.name]}
                onChange={(e) => handleChange(field.name, e.target.value)}
              >
                <option value="" disabled>
                  Select {field.label}
                </option>
                {field.options!.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            )}
          </div>
        ))}

        <div className="mt-4 flex gap-2">
          <Button type="submit">Generate {schema.title}</Button>
          <Button variant="outline" onClick={handleSaveAsTemplate}>
            Save as template
          </Button>
        </div>
      </form>
    </div>
  );
}
