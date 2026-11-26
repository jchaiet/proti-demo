import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Form } from "@/components/BlockRenderer/Form";
import type {
  ConditionalFormField,
  ConditionalFormStep,
} from "@/lib/forms/visibility";
import { visualFixturesEnabled } from "@/visual-fixtures/enabled";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Conditional form fixture | Proti",
  robots: { index: false, follow: false },
};

const interestOptions = [
  { label: "Nutrition", value: "nutrition" },
  { label: "Fitness", value: "fitness" },
  { label: "General", value: "general" },
];

const fields: ConditionalFormField[] = [
  {
    fieldType: "select",
    name: "interest",
    label: "Interest",
    options: interestOptions,
    required: true,
  },
  {
    fieldType: "fieldset",
    name: "dietary_details",
    legend: "Dietary details",
    visibilityCondition: {
      sourceField: "interest",
      operator: "equals",
      value: "nutrition",
    },
    fields: [
      {
        fieldType: "input",
        name: "dietary_goal",
        label: "Dietary goal",
        defaultValue: "Suggested goal",
        required: true,
      },
    ],
  },
  {
    fieldType: "input",
    name: "fitness_goal",
    label: "Fitness goal",
    required: true,
    visibilityCondition: {
      sourceField: "interest",
      operator: "equals",
      value: "fitness",
    },
  },
];

const steps: ConditionalFormStep[] = [
  {
    id: "first",
    title: "Choose an interest",
    fields: [
      {
        fieldType: "select",
        name: "step_interest",
        label: "Step interest",
        options: interestOptions,
        required: true,
      },
    ],
  },
  {
    id: "second",
    title: "Additional information",
    fields: [
      {
        fieldType: "input",
        name: "step_goal",
        label: "Step dietary goal",
        required: true,
        visibilityCondition: {
          sourceField: "step_interest",
          operator: "equals",
          value: "nutrition",
        },
      },
      { fieldType: "input", name: "email", label: "Email", type: "email" },
    ],
  },
];

export default function ConditionalFormFixturePage() {
  if (!visualFixturesEnabled()) notFound();
  return (
    <main
      data-mino-theme
      data-visual-fixture="conditional-form"
      style={{ maxWidth: 780, margin: "2rem auto", padding: 24 }}
    >
      <section data-form-variant="single">
        <h1>Conditional form — single page</h1>
        <Form
          formKey="fixture-single"
          blockKey="form-single"
          siteId="visual-fixtures"
          locale="en-us"
          title="Choose your interests"
          fields={fields}
        />
      </section>
      <section data-form-variant="stepped" style={{ marginTop: 64 }}>
        <h2>Conditional form — multiple steps</h2>
        <Form
          formKey="fixture-steps"
          blockKey="form-steps"
          siteId="visual-fixtures"
          locale="en-us"
          title="Tell us more"
          steps={steps}
        />
      </section>
    </main>
  );
}
