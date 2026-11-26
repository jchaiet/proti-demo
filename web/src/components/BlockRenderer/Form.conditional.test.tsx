import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { FormEvent, ReactNode } from "react";
import type {
  ConditionalFormField,
  ConditionalFormStep,
} from "@/lib/forms/visibility";
import { Form } from "./Form";

const { replace } = vi.hoisted(() => ({ replace: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }) }));
vi.mock("@/cms/resolvers/icon", () => ({ resolveIcon: () => undefined }));

// A small semantic FormBlock mock. It deliberately receives *filtered* Mino
// config, so tests cover the actual Proti -> Mino handoff and DOM FormData.
vi.mock("mino-ui/blocks/FormBlock", async () => {
  const React = await import("react");
  type Field = {
    name?: string;
    fieldType?: string;
    label?: string;
    legend?: string;
    fields?: Field[];
    value?: string;
    options?: Array<{ value: string; label: string }>;
    defaultValue?: string | string[];
    defaultChecked?: boolean;
    required?: boolean;
    disabled?: boolean;
    multiple?: boolean;
    visibilityCondition?: unknown;
  };
  type Step = { id: string; fields: Field[] };
  type Props = {
    fields?: Field[];
    steps?: Step[];
    onSubmit: (
      values: Record<string, string>,
      event: FormEvent<HTMLFormElement>,
    ) => Promise<void>;
    isSubmitted?: boolean;
    submissionError?: string;
  };
  function renderField(field: Field): ReactNode {
    if (field.visibilityCondition)
      throw new Error("Sanity conditions leaked into Mino props");
    if (field.fieldType === "fieldset") {
      return (
        <fieldset key={field.name} disabled={field.disabled}>
          <legend>{field.legend}</legend>
          {field.fields?.map(renderField)}
        </fieldset>
      );
    }
    if (field.fieldType === "select") {
      return (
        <label key={field.name}>
          {field.label}
          <select
            name={field.name}
            multiple={field.multiple}
            defaultValue={field.defaultValue}
            disabled={field.disabled}
            required={field.required}
          >
            {!field.multiple && <option value="">Select...</option>}
            {field.options?.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      );
    }
    if (field.fieldType === "checkbox") {
      return (
        <label key={field.name}>
          <input
            type="checkbox"
            name={field.name}
            value={field.value ?? "on"}
            defaultChecked={field.defaultChecked}
            disabled={field.disabled}
            required={field.required}
          />
          {field.label}
        </label>
      );
    }
    if (field.fieldType === "radio") {
      return (
        <fieldset key={field.name}>
          <legend>{field.label}</legend>
          {field.options?.map((option) => (
            <label key={option.value}>
              <input
                type="radio"
                name={field.name}
                value={option.value}
                defaultChecked={field.defaultValue === option.value}
                required={field.required}
              />
              {option.label}
            </label>
          ))}
        </fieldset>
      );
    }
    return (
      <label key={field.name}>
        {field.label}
        <input
          name={field.name}
          defaultValue={field.defaultValue as string | undefined}
          required={field.required}
          disabled={field.disabled}
        />
      </label>
    );
  }
  const FormBlock = ({
    fields = [],
    steps = [],
    onSubmit,
    isSubmitted,
    submissionError,
  }: Props) => {
    const [step, setStep] = React.useState(0);
    if (isSubmitted) return <div>Message sent</div>;
    const hasSteps = steps.length > 0;
    function validate(container: HTMLElement | null) {
      return !Array.from(
        container?.querySelectorAll<HTMLInputElement | HTMLSelectElement>(
          "input,select",
        ) ?? [],
      ).some((control) => !control.disabled && !control.checkValidity());
    }
    return (
      <>
        {submissionError && <div role="alert">{submissionError}</div>}
        <form
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            const scope = hasSteps
              ? event.currentTarget.querySelector<HTMLElement>(
                  `[data-step="${step}"]`,
                )
              : event.currentTarget;
            if (!validate(scope)) return;
            if (hasSteps && step < steps.length - 1) {
              setStep((value) => value + 1);
              return;
            }
            void onSubmit({}, event);
          }}
        >
          {hasSteps
            ? steps.map((item, index) => (
                <div key={item.id} data-step={index} hidden={index !== step}>
                  {item.fields.map(renderField)}
                </div>
              ))
            : fields.map(renderField)}
          {hasSteps && step > 0 && (
            <button type="button" onClick={() => setStep((value) => value - 1)}>
              Previous
            </button>
          )}
          {hasSteps && step < steps.length - 1 ? (
            <button type="submit">Next</button>
          ) : (
            <button type="submit">Submit</button>
          )}
        </form>
      </>
    );
  };
  return { FormBlock };
});

const context = {
  formKey: "contact",
  blockKey: "block-1",
  siteId: "site-1",
  locale: "en-us",
};
const condition = {
  sourceField: "interest",
  operator: "equals" as const,
  value: "nutrition",
};
const trigger: ConditionalFormField = {
  fieldType: "select",
  name: "interest",
  label: "Interest",
  options: [
    { label: "Nutrition", value: "nutrition" },
    { label: "Fitness", value: "fitness" },
  ],
};
const goal: ConditionalFormField = {
  fieldType: "input",
  name: "goal",
  label: "Dietary goal",
  required: true,
  visibilityCondition: condition,
};

beforeEach(() => replace.mockReset());
afterEach(() => vi.unstubAllGlobals());

async function submitAndReadBody() {
  const fetchMock = vi.fn().mockResolvedValue({ ok: true });
  vi.stubGlobal("fetch", fetchMock);
  fireEvent.click(screen.getByRole("button", { name: "Submit" }));
  await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
  return JSON.parse(fetchMock.mock.calls[0][1].body as string) as {
    fields: Record<string, string | string[]>;
  };
}

describe("conditional form browser integration (Batch 2B)", () => {
  it("reveals required fields immediately and leaves focus on the trigger", () => {
    render(<Form {...context} fields={[trigger, goal]} />);
    expect(screen.queryByLabelText("Dietary goal")).not.toBeInTheDocument();
    const select = screen.getByLabelText("Interest");
    select.focus();
    fireEvent.change(select, { target: { value: "nutrition" } });
    expect(screen.getByLabelText("Dietary goal")).toBeInTheDocument();
    expect(select).toHaveFocus();
    expect(
      screen.getByText(/Additional form fields available: Dietary goal/),
    ).toBeInTheDocument();
    fireEvent.change(select, { target: { value: "fitness" } });
    expect(screen.queryByLabelText("Dietary goal")).not.toBeInTheDocument();
    expect(select).toHaveFocus();
  });

  it("ignores a hidden required field and excludes its previous value from submission", async () => {
    render(<Form {...context} fields={[trigger, goal]} />);
    const select = screen.getByLabelText("Interest");
    fireEvent.change(select, { target: { value: "nutrition" } });
    fireEvent.change(screen.getByLabelText("Dietary goal"), {
      target: { value: "Build muscle" },
    });
    fireEvent.change(select, { target: { value: "fitness" } });
    const result = await submitAndReadBody();
    expect(result.fields).toEqual({ interest: "fitness" });
  });

  it("clears authored defaults when a conditional field gets hidden and then reappears", () => {
    render(
      <Form
        {...context}
        fields={[trigger, { ...goal, defaultValue: "preset" }]}
      />,
    );
    const select = screen.getByLabelText("Interest");
    fireEvent.change(select, { target: { value: "nutrition" } });
    expect(screen.getByLabelText("Dietary goal")).toHaveValue("preset");
    fireEvent.change(select, { target: { value: "fitness" } });
    fireEvent.change(select, { target: { value: "nutrition" } });
    expect(screen.getByLabelText("Dietary goal")).toHaveValue("");
  });

  it("removes nested Fieldset controls and their values when its parent hides", async () => {
    const nested: ConditionalFormField = {
      fieldType: "fieldset",
      name: "details",
      legend: "Personal details",
      visibilityCondition: condition,
      fields: [
        {
          fieldType: "input",
          name: "notes",
          label: "Additional notes",
          required: true,
        },
      ],
    };
    render(<Form {...context} fields={[trigger, nested]} />);
    const select = screen.getByLabelText("Interest");
    fireEvent.change(select, { target: { value: "nutrition" } });
    fireEvent.change(screen.getByLabelText("Additional notes"), {
      target: { value: "Private" },
    });
    fireEvent.change(select, { target: { value: "fitness" } });
    expect(
      screen.queryByRole("group", { name: "Personal details" }),
    ).not.toBeInTheDocument();
    expect((await submitAndReadBody()).fields).toEqual({ interest: "fitness" });
  });

  it("evaluates checkbox notEquals when the checkbox is unchecked", () => {
    const checkbox: ConditionalFormField = {
      fieldType: "checkbox",
      name: "optin",
      label: "Updates",
      value: "yes",
    };
    const branch: ConditionalFormField = {
      ...goal,
      visibilityCondition: {
        sourceField: "optin",
        operator: "notEquals",
        value: "yes",
      },
    };
    render(<Form {...context} fields={[checkbox, branch]} />);
    expect(screen.getByLabelText("Dietary goal")).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText("Updates"));
    expect(screen.queryByLabelText("Dietary goal")).not.toBeInTheDocument();
  });

  it("supports multiple-select contains with exactly one selected option", () => {
    const multi: ConditionalFormField = { ...trigger, multiple: true };
    const branch: ConditionalFormField = {
      ...goal,
      visibilityCondition: {
        sourceField: "interest",
        operator: "contains",
        value: "nutrition",
      },
    };
    render(<Form {...context} fields={[multi, branch]} />);
    const select = screen.getByLabelText("Interest") as HTMLSelectElement;
    select.options[0].selected = true;
    fireEvent.change(select);
    expect(screen.getByLabelText("Dietary goal")).toBeInTheDocument();
  });

  it("preserves earlier-step trigger values when navigating steps", async () => {
    const steps: ConditionalFormStep[] = [
      { id: "first", fields: [trigger] },
      { id: "second", fields: [goal] },
    ];
    render(<Form {...context} steps={steps} />);
    fireEvent.change(screen.getByLabelText("Interest"), {
      target: { value: "nutrition" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByLabelText("Dietary goal")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Dietary goal"), {
      target: { value: "Improve diet" },
    });
    const result = await submitAndReadBody();
    expect(result.fields).toEqual({
      interest: "nutrition",
      goal: "Improve diet",
    });
  });
});
