"use client"

import React, { useState } from "react"
import {
  IconFileText,
  IconDownload,
  IconMail,
  IconBrandWhatsapp,
  IconPrinter,
  IconPencil,
  IconPhoto,
  IconCheck,
  IconX,
  IconChevronRight,
  IconSparkles,
  IconBuildingStore,
  IconHome,
  IconShieldCheck,
  IconClock,
  IconCurrencyDollar
} from "@tabler/icons-react"
import { cn } from "@/lib/utils"

// Theme colors matching Rooftops AI
const theme = {
  primary: "#0D9488",
  primaryLight: "#14B8A6",
  primaryDark: "#0F766E",
  primaryBg: "#F0FDFA",
  accent: "#F59E0B",
  success: "#10B981",
  warning: "#F59E0B",
  danger: "#EF4444",
  gray50: "#F9FAFB",
  gray100: "#F3F4F6",
  gray200: "#E5E7EB",
  gray300: "#D1D5DB",
  gray400: "#9CA3AF",
  gray500: "#6B7280",
  gray600: "#4B5563",
  gray700: "#374151",
  gray800: "#1F2937",
  gray900: "#111827",
  white: "#FFFFFF"
}

interface ProposalTemplate {
  id: string
  name: string
  description: string
  category: "professional" | "simple" | "detailed"
  preview: string
  popular?: boolean
}

const PROPOSAL_TEMPLATES: ProposalTemplate[] = [
  {
    id: "professional-standard",
    name: "Professional Standard",
    description: "Clean, modern design perfect for residential customers",
    category: "professional",
    preview: "professional",
    popular: true
  },
  {
    id: "detailed-breakdown",
    name: "Detailed Breakdown",
    description: "Comprehensive with itemized costs and specifications",
    category: "detailed",
    preview: "detailed"
  },
  {
    id: "quick-quote",
    name: "Quick Quote",
    description: "Simple one-page summary for fast turnaround",
    category: "simple",
    preview: "simple"
  },
  {
    id: "insurance-ready",
    name: "Insurance Ready",
    description: "Formatted for insurance claims with required documentation",
    category: "detailed",
    preview: "insurance"
  }
]

interface CompanyInfo {
  name: string
  address: string
  phone: string
  email: string
  website: string
  license: string
  logo?: string
}

interface ProposalData {
  customerName: string
  customerAddress: string
  customerEmail: string
  customerPhone: string
  propertyAddress: string
  roofSize: number
  estimateTotal: number
  estimateItems: Array<{
    name: string
    qty: number
    unit: string
    price: number
    total: number
  }>
  validUntil?: string
  notes?: string
  warranty?: string
}

interface ProposalTemplatesProps {
  estimateItems: Array<{
    id: string
    name: string
    qty: number
    unit: string
    price: number
  }>
  estimateTotal: number
  propertyAddress: string
  roofSize: number
  onClose: () => void
  companyInfo?: CompanyInfo
}

export function ProposalTemplates({
  estimateItems,
  estimateTotal,
  propertyAddress,
  roofSize,
  onClose,
  companyInfo
}: ProposalTemplatesProps) {
  const [step, setStep] = useState<"select" | "customize" | "preview">("select")
  const [selectedTemplate, setSelectedTemplate] =
    useState<ProposalTemplate | null>(null)
  const [customerInfo, setCustomerInfo] = useState({
    name: "",
    email: "",
    phone: "",
    notes: ""
  })
  const [proposalOptions, setProposalOptions] = useState({
    includePhotos: true,
    includeWarranty: true,
    includePaymentTerms: true,
    validDays: 30
  })

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  const handleSelectTemplate = (template: ProposalTemplate) => {
    setSelectedTemplate(template)
    setStep("customize")
  }

  const handleGenerateProposal = () => {
    setStep("preview")
  }

  const handleDownloadPDF = () => {
    // In a real implementation, this would generate a PDF
    alert("PDF generation would be implemented here")
  }

  const handleSendEmail = () => {
    // In a real implementation, this would send an email
    alert("Email sending would be implemented here")
  }

  // Template Selection Step
  const TemplateSelectionStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-bold text-gray-900">
          Choose a Proposal Template
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          Select a template that best fits your customer&apos;s needs
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {PROPOSAL_TEMPLATES.map(template => (
          <button
            key={template.id}
            onClick={() => handleSelectTemplate(template)}
            className={cn(
              "group relative overflow-hidden rounded-xl border-2 p-4 text-left transition-all hover:border-teal-500 hover:shadow-lg",
              template.popular
                ? "border-teal-200 bg-teal-50/50"
                : "border-gray-200 bg-white"
            )}
          >
            {template.popular && (
              <div className="absolute right-2 top-2 flex items-center gap-1 rounded-full bg-teal-500 px-2 py-0.5 text-[10px] font-semibold text-white">
                <IconSparkles className="size-3" />
                Popular
              </div>
            )}

            {/* Template Preview Placeholder */}
            <div className="mb-3 aspect-[4/3] rounded-lg bg-gradient-to-br from-gray-100 to-gray-200 p-3">
              <div className="flex h-full flex-col">
                <div className="mb-2 h-3 w-1/2 rounded bg-gray-300"></div>
                <div className="mb-1 h-2 w-3/4 rounded bg-gray-300"></div>
                <div className="mb-3 h-2 w-1/2 rounded bg-gray-300"></div>
                <div className="flex-1 rounded bg-white/50 p-2">
                  <div className="mb-1 h-1.5 w-full rounded bg-gray-200"></div>
                  <div className="mb-1 h-1.5 w-full rounded bg-gray-200"></div>
                  <div className="h-1.5 w-3/4 rounded bg-gray-200"></div>
                </div>
              </div>
            </div>

            <div className="font-semibold text-gray-900 group-hover:text-teal-600">
              {template.name}
            </div>
            <div className="mt-1 text-xs text-gray-500">
              {template.description}
            </div>

            <div className="mt-3 flex items-center gap-1 text-xs font-medium text-teal-600 opacity-0 transition-opacity group-hover:opacity-100">
              Select template <IconChevronRight className="size-3" />
            </div>
          </button>
        ))}
      </div>
    </div>
  )

  // Customization Step
  const CustomizationStep = () => (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => setStep("select")}
          className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
        >
          ←
        </button>
        <div>
          <h2 className="text-xl font-bold text-gray-900">
            Customize Your Proposal
          </h2>
          <p className="text-sm text-gray-500">
            Template: {selectedTemplate?.name}
          </p>
        </div>
      </div>

      {/* Customer Information */}
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-900">
          <IconHome className="size-4 text-teal-500" />
          Customer Information
        </h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">
              Customer Name
            </label>
            <input
              type="text"
              value={customerInfo.name}
              onChange={e =>
                setCustomerInfo({ ...customerInfo, name: e.target.value })
              }
              placeholder="John Smith"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">
              Email
            </label>
            <input
              type="email"
              value={customerInfo.email}
              onChange={e =>
                setCustomerInfo({ ...customerInfo, email: e.target.value })
              }
              placeholder="john@example.com"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">
              Phone
            </label>
            <input
              type="tel"
              value={customerInfo.phone}
              onChange={e =>
                setCustomerInfo({ ...customerInfo, phone: e.target.value })
              }
              placeholder="(555) 123-4567"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">
              Property Address
            </label>
            <input
              type="text"
              value={propertyAddress}
              disabled
              className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-600"
            />
          </div>
        </div>
      </div>

      {/* Proposal Options */}
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-900">
          <IconPencil className="size-4 text-teal-500" />
          Proposal Options
        </h3>
        <div className="space-y-3">
          <label className="flex cursor-pointer items-center gap-3">
            <input
              type="checkbox"
              checked={proposalOptions.includePhotos}
              onChange={e =>
                setProposalOptions({
                  ...proposalOptions,
                  includePhotos: e.target.checked
                })
              }
              className="size-4 rounded border-gray-300 text-teal-500 focus:ring-teal-500"
            />
            <div className="flex items-center gap-2">
              <IconPhoto className="size-4 text-gray-400" />
              <span className="text-sm text-gray-700">
                Include property photos
              </span>
            </div>
          </label>
          <label className="flex cursor-pointer items-center gap-3">
            <input
              type="checkbox"
              checked={proposalOptions.includeWarranty}
              onChange={e =>
                setProposalOptions({
                  ...proposalOptions,
                  includeWarranty: e.target.checked
                })
              }
              className="size-4 rounded border-gray-300 text-teal-500 focus:ring-teal-500"
            />
            <div className="flex items-center gap-2">
              <IconShieldCheck className="size-4 text-gray-400" />
              <span className="text-sm text-gray-700">
                Include warranty information
              </span>
            </div>
          </label>
          <label className="flex cursor-pointer items-center gap-3">
            <input
              type="checkbox"
              checked={proposalOptions.includePaymentTerms}
              onChange={e =>
                setProposalOptions({
                  ...proposalOptions,
                  includePaymentTerms: e.target.checked
                })
              }
              className="size-4 rounded border-gray-300 text-teal-500 focus:ring-teal-500"
            />
            <div className="flex items-center gap-2">
              <IconCurrencyDollar className="size-4 text-gray-400" />
              <span className="text-sm text-gray-700">
                Include payment terms
              </span>
            </div>
          </label>
          <div className="flex items-center gap-3">
            <IconClock className="size-4 text-gray-400" />
            <span className="text-sm text-gray-700">Valid for</span>
            <select
              value={proposalOptions.validDays}
              onChange={e =>
                setProposalOptions({
                  ...proposalOptions,
                  validDays: parseInt(e.target.value)
                })
              }
              className="rounded-lg border border-gray-300 px-2 py-1 text-sm focus:border-teal-500 focus:outline-none"
            >
              <option value={15}>15 days</option>
              <option value={30}>30 days</option>
              <option value={45}>45 days</option>
              <option value={60}>60 days</option>
            </select>
          </div>
        </div>
      </div>

      {/* Additional Notes */}
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-900">
          <IconFileText className="size-4 text-teal-500" />
          Additional Notes
        </h3>
        <textarea
          value={customerInfo.notes}
          onChange={e =>
            setCustomerInfo({ ...customerInfo, notes: e.target.value })
          }
          placeholder="Add any special terms, conditions, or notes for this proposal..."
          rows={3}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
        />
      </div>

      {/* Estimate Summary */}
      <div className="rounded-xl border border-teal-200 bg-teal-50 p-4">
        <h3 className="mb-2 text-sm font-semibold text-teal-800">
          Estimate Summary
        </h3>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs text-teal-600">
              {estimateItems.length} items • {roofSize} squares
            </div>
          </div>
          <div className="text-xl font-bold text-teal-700">
            {formatCurrency(estimateTotal)}
          </div>
        </div>
      </div>

      {/* Generate Button */}
      <button
        onClick={handleGenerateProposal}
        disabled={!customerInfo.name}
        className={cn(
          "w-full rounded-xl py-4 text-base font-semibold transition-all",
          customerInfo.name
            ? "bg-teal-500 text-white hover:bg-teal-600"
            : "cursor-not-allowed bg-gray-200 text-gray-400"
        )}
      >
        Generate Proposal →
      </button>
    </div>
  )

  // Preview Step
  const PreviewStep = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setStep("customize")}
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            ←
          </button>
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              Proposal Preview
            </h2>
            <p className="text-sm text-gray-500">
              Ready to send to {customerInfo.name}
            </p>
          </div>
        </div>
      </div>

      {/* Proposal Preview */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg">
        {/* Header */}
        <div className="bg-teal-500 p-6 text-white">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-2xl font-bold">
                {companyInfo?.name || "Your Roofing Company"}
              </div>
              <div className="mt-1 text-sm opacity-90">
                Licensed & Insured • {companyInfo?.license || "License #12345"}
              </div>
            </div>
            <div className="text-right text-sm">
              <div className="font-semibold">PROPOSAL</div>
              <div className="opacity-90">
                #{Date.now().toString().slice(-6)}
              </div>
            </div>
          </div>
        </div>

        {/* Customer Info */}
        <div className="border-b border-gray-100 p-6">
          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <div className="mb-1 text-xs font-semibold uppercase text-gray-400">
                Prepared For
              </div>
              <div className="font-semibold text-gray-900">
                {customerInfo.name}
              </div>
              <div className="text-sm text-gray-600">{propertyAddress}</div>
              {customerInfo.email && (
                <div className="text-sm text-gray-600">
                  {customerInfo.email}
                </div>
              )}
              {customerInfo.phone && (
                <div className="text-sm text-gray-600">
                  {customerInfo.phone}
                </div>
              )}
            </div>
            <div className="text-right">
              <div className="mb-1 text-xs font-semibold uppercase text-gray-400">
                Project Details
              </div>
              <div className="text-sm text-gray-600">
                Roof Size: {roofSize} squares
              </div>
              <div className="text-sm text-gray-600">
                Valid Until:{" "}
                {new Date(
                  Date.now() + proposalOptions.validDays * 24 * 60 * 60 * 1000
                ).toLocaleDateString()}
              </div>
            </div>
          </div>
        </div>

        {/* Line Items */}
        <div className="p-6">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 text-left text-xs font-semibold uppercase text-gray-500">
                <th className="pb-2">Description</th>
                <th className="pb-2 text-right">Qty</th>
                <th className="pb-2 text-right">Rate</th>
                <th className="pb-2 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {estimateItems.map((item, idx) => (
                <tr key={idx} className="border-b border-gray-100">
                  <td className="py-3 text-sm text-gray-800">{item.name}</td>
                  <td className="py-3 text-right text-sm text-gray-600">
                    {item.qty} {item.unit}
                  </td>
                  <td className="py-3 text-right text-sm text-gray-600">
                    ${item.price.toFixed(2)}
                  </td>
                  <td className="py-3 text-right text-sm font-medium text-gray-800">
                    {formatCurrency(item.qty * item.price)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td
                  colSpan={3}
                  className="pt-4 text-right text-lg font-bold text-gray-900"
                >
                  Total
                </td>
                <td className="pt-4 text-right text-lg font-bold text-teal-600">
                  {formatCurrency(estimateTotal)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Warranty Section */}
        {proposalOptions.includeWarranty && (
          <div className="border-t border-gray-100 bg-gray-50 p-6">
            <div className="flex items-start gap-3">
              <IconShieldCheck className="mt-0.5 size-5 text-teal-500" />
              <div>
                <div className="font-semibold text-gray-900">
                  Warranty Information
                </div>
                <div className="mt-1 text-sm text-gray-600">
                  Workmanship warranty: 10 years • Manufacturer warranty: 30
                  years on shingles
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Notes */}
        {customerInfo.notes && (
          <div className="border-t border-gray-100 p-6">
            <div className="text-xs font-semibold uppercase text-gray-400">
              Notes
            </div>
            <div className="mt-1 text-sm text-gray-600">
              {customerInfo.notes}
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="grid gap-3 sm:grid-cols-3">
        <button
          onClick={handleDownloadPDF}
          className="flex items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white py-3 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
        >
          <IconDownload className="size-4" />
          Download PDF
        </button>
        <button
          onClick={handleSendEmail}
          className="flex items-center justify-center gap-2 rounded-xl bg-teal-500 py-3 text-sm font-semibold text-white transition-colors hover:bg-teal-600"
        >
          <IconMail className="size-4" />
          Send via Email
        </button>
        <button className="flex items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white py-3 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50">
          <IconPrinter className="size-4" />
          Print
        </button>
      </div>
    </div>
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-gray-50 p-6 shadow-2xl">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-2 text-gray-400 hover:bg-gray-200 hover:text-gray-600"
        >
          <IconX className="size-5" />
        </button>

        {/* Step Content */}
        {step === "select" && <TemplateSelectionStep />}
        {step === "customize" && <CustomizationStep />}
        {step === "preview" && <PreviewStep />}
      </div>
    </div>
  )
}

// Export button component to trigger proposals from estimate builder
export function CreateProposalButton({
  estimateItems,
  estimateTotal,
  propertyAddress,
  roofSize,
  disabled = false
}: {
  estimateItems: Array<{
    id: string
    name: string
    qty: number
    unit: string
    price: number
  }>
  estimateTotal: number
  propertyAddress: string
  roofSize: number
  disabled?: boolean
}) {
  const [showProposals, setShowProposals] = useState(false)

  return (
    <>
      <button
        onClick={() => setShowProposals(true)}
        disabled={disabled}
        className={cn(
          "flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition-all",
          disabled
            ? "cursor-not-allowed bg-gray-100 text-gray-400"
            : "bg-gradient-to-r from-teal-500 to-teal-600 text-white shadow-lg shadow-teal-500/25 hover:shadow-xl hover:shadow-teal-500/30"
        )}
      >
        <IconFileText className="size-4" />
        Create Proposal
      </button>

      {showProposals && (
        <ProposalTemplates
          estimateItems={estimateItems}
          estimateTotal={estimateTotal}
          propertyAddress={propertyAddress}
          roofSize={roofSize}
          onClose={() => setShowProposals(false)}
        />
      )}
    </>
  )
}
