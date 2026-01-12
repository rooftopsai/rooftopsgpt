# Accessibility Verification Checklist - US-34

**Purpose**: Ensure all tier-related UI components meet WCAG AA accessibility standards.

**Testing Standards**:
- WCAG 2.1 Level AA compliance
- Target: Lighthouse Accessibility Score 90+
- Keyboard accessibility (ESC, TAB, ENTER)
- Screen reader compatibility
- Color contrast ratio 4.5:1 minimum

**Tester**: _____________
**Date**: _____________
**Environment**: _____________

---

## 📋 Testing Setup

### Tools Required

**Browser DevTools (Built-in)**:
- Chrome DevTools → Lighthouse audit
- Chrome DevTools → Elements → Accessibility pane
- Firefox DevTools → Accessibility inspector

**Color Contrast Checkers**:
- WebAIM Contrast Checker: https://webaim.org/resources/contrastchecker/
- Chrome DevTools → Elements → Computed → Color picker shows contrast ratio
- Firefox DevTools → Accessibility → Color contrast

**Screen Readers** (Optional but Recommended):
- macOS: VoiceOver (Cmd+F5)
- Windows: NVDA (free) or JAWS
- Chrome Extension: ChromeVox

**Keyboard Testing**:
- Physical keyboard or on-screen keyboard
- Test without mouse/trackpad

---

## ✅ TEST SUITE 1: KEYBOARD ACCESSIBILITY

### Modals

**Upgrade Modal** (`components/modals/upgrade-modal.tsx`):
- [ ] **ESC key closes modal**
  - Open upgrade modal (hit report limit or click locked agent)
  - Press ESC key
  - Modal should close

- [ ] **TAB key navigates through modal**
  - Open modal
  - Press TAB repeatedly
  - Should cycle through: Close button → Premium Upgrade button → Business Upgrade button → back to Close
  - Focus should be trapped within modal (not tab to elements behind)

- [ ] **ENTER/SPACE activates buttons**
  - TAB to "Upgrade to Premium" button
  - Press ENTER or SPACE
  - Should navigate to pricing page

- [ ] **Shift+TAB navigates backwards**
  - Open modal, TAB to last element
  - Press Shift+TAB
  - Should navigate backwards through elements

- [ ] **Focus visible on all elements**
  - TAB through modal
  - Each focused element should have visible focus ring/outline
  - Focus indicator should have adequate contrast (3:1 minimum)

**Onboarding Modal** (`components/modals/onboarding-modal.tsx`):
- [ ] **ESC key closes modal**
  - Open onboarding modal (first-time user)
  - Press ESC
  - Modal should close and mark onboarding complete

- [ ] **TAB navigates through steps**
  - Open modal
  - TAB through: Skip button → Primary action button → back to Skip
  - Focus trapped within modal

- [ ] **ENTER activates buttons**
  - TAB to "Go to Explore" button
  - Press ENTER
  - Should navigate to Explore page

- [ ] **Arrow keys navigate slides** (if applicable)
  - Test Left/Right arrow keys to change steps
  - If not implemented, TAB to Next button is sufficient

**Payment Failure Banner**:
- [ ] **TAB navigates to action button**
  - Banner visible (payment failure state)
  - TAB should focus "Update Payment Method" button
  - ENTER activates button

**Cancellation Notice Banner**:
- [ ] **TAB navigates to action button**
  - Banner visible (subscription cancelled)
  - TAB focuses "Reactivate Subscription" button
  - ENTER opens Stripe portal

**Downgrade Notice Banner**:
- [ ] **TAB navigates to action button**
  - Banner visible (scheduled downgrade)
  - TAB focuses "Cancel Downgrade" button
  - ENTER cancels downgrade

### Forms & Inputs

**Chat Input Field**:
- [ ] **TAB focuses chat input**
  - Navigate to Chat page
  - Press TAB until chat input focused
  - Cursor appears in text field

- [ ] **ENTER sends message**
  - Type message
  - Press ENTER
  - Message should send (not requiring mouse click)

- [ ] **Shift+ENTER adds new line** (if applicable)
  - Type message, press Shift+ENTER
  - Should insert line break instead of sending

**Address Input (Explore Page)**:
- [ ] **TAB focuses address input**
  - Navigate to Explore page
  - TAB to address field
  - Cursor appears

- [ ] **Arrow keys navigate autocomplete results**
  - Type address, autocomplete appears
  - Arrow Down/Up selects results
  - ENTER selects highlighted result

### Buttons & Links

**Navigation Links** (Sidebar):
- [ ] **TAB navigates through nav links**
  - TAB through: Explore → Chat → Agents → Settings
  - Focus visible on each link

- [ ] **ENTER activates links**
  - TAB to Chat link
  - Press ENTER
  - Navigates to Chat page

**Pricing Page Buttons**:
- [ ] **TAB cycles through Subscribe buttons**
  - Navigate to /pricing
  - TAB through: Free → Premium → Business Subscribe buttons
  - Focus visible on each

- [ ] **ENTER activates subscription**
  - TAB to "Subscribe to Premium"
  - Press ENTER
  - Initiates Stripe checkout

**Agent Cards**:
- [ ] **TAB focuses agent cards**
  - Navigate to /creator
  - TAB through agent cards
  - Each card should be focusable

- [ ] **ENTER opens agent** (or shows modal if locked)
  - TAB to first agent
  - Press ENTER
  - Should open agent page or upgrade modal (if free tier)

---

## ✅ TEST SUITE 2: ARIA LABELS & SEMANTIC HTML

### Usage Counters (`components/sidebar/usage-stats.tsx`)

- [ ] **Progress bars have role="progressbar"**
  - Inspect usage counter progress bars in DevTools
  - Should have `role="progressbar"` attribute
  - **Current Status**: ❌ Missing (line 153-161)

- [ ] **Progress bars have aria-valuenow**
  - Should have `aria-valuenow="{used}"`
  - **Current Status**: ❌ Missing

- [ ] **Progress bars have aria-valuemin**
  - Should have `aria-valuemin="0"`
  - **Current Status**: ❌ Missing

- [ ] **Progress bars have aria-valuemax**
  - Should have `aria-valuemax="{limit}"`
  - **Current Status**: ❌ Missing

- [ ] **Progress bars have aria-label**
  - Example: `aria-label="Reports usage: 8 of 20 used"`
  - **Current Status**: ❌ Missing

- [ ] **Icons have aria-hidden="true"**
  - Decorative icons (Sparkles, MessageCircle, Search) should be hidden from screen readers
  - Text labels provide sufficient context
  - **Current Status**: ⚠️ Not set (icons are read by screen readers)

### Premium Badges (`app/[locale]/[workspaceid]/creator/page.tsx`)

- [ ] **Premium badge has aria-label**
  - Line 170: `<span className="...">` should have `aria-label="Premium feature"`
  - **Current Status**: ❌ Missing (line 168-180)

- [ ] **Premium badge icon has aria-hidden="true"**
  - Star icon is decorative, should be hidden
  - **Current Status**: ⚠️ Not set

- [ ] **Lock overlay has aria-label**
  - Lock icon overlay (line 185-199) should describe access restriction
  - Example: `aria-label="Premium feature - Upgrade required"`
  - **Current Status**: ❌ Missing

### Onboarding Progress Indicators

- [ ] **Progress dots have aria-label**
  - Line 115-127: Progress indicators should describe current step
  - Example: `aria-label="Step 1 of 3 - Current step"`
  - **Current Status**: ❌ Missing

- [ ] **Progress dots have role="progressbar" or role="group"**
  - Should indicate progress semantically
  - **Current Status**: ❌ Missing (just divs with visual styling)

### Modal Accessibility (Built-in via Radix UI)

- [ ] **Modals have role="dialog"**
  - Radix UI Dialog automatically provides `role="dialog"`
  - **Current Status**: ✅ Built-in

- [ ] **Modals have aria-labelledby**
  - DialogTitle automatically provides `aria-labelledby`
  - **Current Status**: ✅ Built-in (Upgrade Modal: line 63-65, Onboarding: line 108-110)

- [ ] **Modals have aria-describedby**
  - DialogDescription provides `aria-describedby`
  - **Current Status**: ✅ Built-in (Upgrade Modal: line 66)

### Images & Avatars

- [ ] **Agent avatars have meaningful alt text**
  - Line 207-211: `<img src={agent.avatarUrl} alt={agent.name} />`
  - **Current Status**: ✅ Has alt text with agent name

- [ ] **Decorative images have alt=""**
  - Lock icons, background images should have empty alt
  - **Current Status**: ⚠️ Lock icon is SVG, no alt needed but should have aria-hidden="true"

---

## ✅ TEST SUITE 3: COLOR CONTRAST (WCAG AA - 4.5:1)

### Text on Backgrounds

Use browser DevTools or WebAIM contrast checker to verify:

**Pricing Page**:
- [ ] **Plan names on white background** (Free, Premium, Business)
  - Text: Black (#000000 or similar)
  - Background: White (#FFFFFF)
  - Expected ratio: 21:1 ✅ (exceeds 4.5:1)

- [ ] **Price text on white background** ($0, $29, $99)
  - Should have sufficient contrast
  - Expected: Pass ✅

- [ ] **Feature list text** (gray text on white)
  - Example: "text-gray-500 dark:text-gray-400"
  - Light mode: #6B7280 on #FFFFFF = ~4.6:1 ✅
  - Dark mode: #9CA3AF on #1F2937 = ~4.7:1 ✅

- [ ] **"MOST POPULAR" badge** (white text on blue)
  - Text: White (#FFFFFF)
  - Background: Blue (#2563EB or similar)
  - Expected ratio: ~8:1 ✅

**Upgrade Modal**:
- [ ] **Modal title** (black on white)
  - Expected: 21:1 ✅

- [ ] **Dialog description** (gray on white)
  - Should meet 4.5:1 minimum
  - Verify in DevTools

**Usage Counters**:
- [ ] **Usage text** (e.g., "8/20 Reports")
  - Default: Should be dark text on light background
  - Verify: >4.5:1

- [ ] **"Limit reached" warning** (red text)
  - Text: Red (text-red-500 = #EF4444)
  - Background: White or sidebar background
  - Light mode: #EF4444 on #FFFFFF = 3.9:1 ⚠️ **FAILS** (needs darker red)
  - **Action Required**: Change to text-red-600 (#DC2626) = 4.5:1 ✅

- [ ] **Amber warning text** (text-amber-500)
  - Text: #F59E0B
  - Background: White
  - Ratio: 2.8:1 ❌ **FAILS** (needs darker amber)
  - **Action Required**: Change to text-amber-700 (#B45309) = 4.6:1 ✅

**Buttons**:
- [ ] **Primary button text** (white on blue)
  - Expected: Pass ✅

- [ ] **Outline button text** (blue on white)
  - Expected: Pass ✅

- [ ] **Disabled button contrast**
  - Should have reduced opacity but still readable
  - Minimum 3:1 for disabled state (WCAG AA exception)

**Premium Badge** (Agent Library):
- [ ] **"Premium" text on gradient** (white on orange/amber)
  - Text: White (#FFFFFF)
  - Background: Gradient from-amber-500 to-orange-500
  - Worst case (lightest point): #F59E0B
  - Ratio: 2.3:1 ❌ **FAILS**
  - **Action Required**: Darken gradient or add text shadow

**Banners** (Payment Failure, Cancellation, Downgrade):
- [ ] **Banner text on colored background**
  - Yellow/amber warning banner with dark text
  - Should meet 4.5:1
  - Verify in DevTools

### Focus Indicators

- [ ] **Focus ring contrast**
  - Focus outline should be visible against all backgrounds
  - Minimum 3:1 contrast (WCAG 2.1 AA for non-text)
  - Default browser focus (blue outline) typically passes

- [ ] **Focus visible on light backgrounds**
  - TAB through elements on white backgrounds
  - Focus ring clearly visible

- [ ] **Focus visible on dark backgrounds**
  - TAB through elements in dark mode
  - Focus ring clearly visible

---

## ✅ TEST SUITE 4: SCREEN READER TESTING

### Usage Counters

**With VoiceOver (macOS)** or **NVDA (Windows)**:
- [ ] **Reports counter announces correctly**
  - Navigate to usage counter
  - Should announce: "Reports, 8 of 20 used" or similar
  - **Expected Issues**: May just read "8/20" without context (no aria-label)

- [ ] **Progress bar announces value**
  - Should announce: "40 percent" or "8 of 20"
  - **Expected Issues**: May not announce (missing role="progressbar")

- [ ] **Icons are not redundantly announced**
  - Sparkles icon should be hidden (aria-hidden="true")
  - Text label "Reports" is sufficient

### Premium Badges

- [ ] **Premium badge announces access restriction**
  - Focus on locked agent card
  - Should announce: "Premium feature - Upgrade required"
  - **Expected Issues**: May just read "Premium" without context

- [ ] **Lock icon described**
  - Should announce lock status
  - **Expected Issues**: SVG lock icon may not be accessible

### Modals

- [ ] **Modal announces title and description**
  - Open upgrade modal
  - Screen reader should announce: "Dialog, Upgrade Required, You've used your free report..."
  - **Current Status**: ✅ Should work (Radix UI provides ARIA)

- [ ] **Modal close button labeled**
  - Screen reader should announce "Close" or "Close dialog"
  - Verify Radix UI provides label

### Buttons

- [ ] **Buttons announce purpose**
  - "Upgrade to Premium" button should announce full text
  - Icon-only buttons should have aria-label

---

## ✅ TEST SUITE 5: LIGHTHOUSE AUDIT

### Running Lighthouse

**Chrome DevTools**:
1. Open DevTools (F12 or Cmd+Option+I)
2. Go to "Lighthouse" tab
3. Select:
   - Categories: Accessibility ✅
   - Device: Desktop
   - Mode: Navigation
4. Click "Analyze page load"

**Pages to Audit**:
- [ ] **Pricing page** (`/pricing`)
  - Target score: 90+
  - Check for: color contrast, button labels, ARIA

- [ ] **Agent library** (`/[workspaceid]/creator`)
  - Target score: 90+
  - Check for: lock icons, premium badges, ARIA

- [ ] **Billing settings** (`/[workspaceid]/settings/billing`)
  - Target score: 90+
  - Check for: usage counters, buttons, form labels

- [ ] **Explore page** (`/[workspaceid]/explore`)
  - Target score: 90+
  - Check for: address input, report viewer, ARIA

- [ ] **Chat page** (`/[workspaceid]/chat`)
  - Target score: 90+
  - Check for: chat input, message list, ARIA

### Common Lighthouse Issues

- **Buttons do not have an accessible name**
  - Icon-only buttons need aria-label
  - Example: Close button (X) in modals

- **Links do not have a discernible name**
  - Links with only icons need aria-label

- **Background and foreground colors do not have sufficient contrast**
  - Text colors must meet 4.5:1 ratio
  - Identified issues: text-red-500, text-amber-500, premium badge

- **Elements must have sufficient color contrast**
  - UI elements (borders, icons) should have 3:1 minimum

- **[role="progressbar"] elements do not have required ARIA attributes**
  - Progress bars need aria-valuenow, aria-valuemin, aria-valuemax

---

## 🐛 KNOWN ACCESSIBILITY ISSUES

### Critical Issues (Must Fix)

1. **Progress bars missing ARIA attributes** (`components/sidebar/usage-stats.tsx:153-161`)
   - Missing: `role="progressbar"`, `aria-valuenow`, `aria-valuemin`, `aria-valuemax`, `aria-label`
   - Impact: Screen readers cannot announce progress
   - Fix: Add ARIA attributes to progress bar divs

2. **Color contrast failures**
   - `text-red-500` on white: 3.9:1 ❌ (needs 4.5:1)
   - `text-amber-500` on white: 2.8:1 ❌ (needs 4.5:1)
   - Premium badge white on amber gradient: 2.3:1 ❌
   - Impact: Low vision users cannot read text
   - Fix: Use darker shades (text-red-600, text-amber-700)

### High Priority Issues

3. **Premium badge missing aria-label** (`app/[locale]/[workspaceid]/creator/page.tsx:170`)
   - Missing: `aria-label="Premium feature - Upgrade required"`
   - Impact: Screen reader users don't understand badge meaning
   - Fix: Add descriptive aria-label

4. **Lock overlay missing aria-label** (`creator/page.tsx:185-199`)
   - Missing: `aria-label` on lock icon container
   - Impact: Screen readers don't announce access restriction
   - Fix: Add aria-label to lock overlay div

5. **Onboarding progress indicators missing ARIA** (`components/modals/onboarding-modal.tsx:115-127`)
   - Missing: `aria-label`, `role="progressbar"` or `role="group"`
   - Impact: Screen readers cannot announce current step
   - Fix: Add semantic progress role and labels

### Medium Priority Issues

6. **Icons not hidden from screen readers**
   - Decorative icons (Sparkles, MessageCircle, Search) should have `aria-hidden="true"`
   - Impact: Screen readers read icon names redundantly
   - Fix: Add aria-hidden="true" to decorative icons

7. **Usage counter text should have aria-label**
   - "8/20" text should be labeled as "8 of 20 reports used"
   - Impact: Screen readers may not provide context
   - Fix: Wrap in span with aria-label

---

## 📝 CODE REVIEW FINDINGS

### ✅ Good Accessibility Patterns

1. **Radix UI Dialog Components**
   - ✅ Automatic `role="dialog"`, `aria-labelledby`, `aria-describedby`
   - ✅ Focus trap and ESC key handling built-in
   - ✅ Keyboard navigation (TAB, ENTER) works correctly

2. **Semantic HTML**
   - ✅ Uses `<button>` elements instead of div onClick
   - ✅ Uses `<Dialog>`, `<DialogTitle>`, `<DialogDescription>` semantic components

3. **Alt Text on Images**
   - ✅ Agent avatars have meaningful alt text (`alt={agent.name}`)

4. **Button Text**
   - ✅ Most buttons have descriptive text ("Upgrade to Premium", "Subscribe to Business")

### ⚠️ Areas Needing Improvement

1. **ARIA Attributes**
   - ❌ Progress bars missing `role="progressbar"` and aria-value* attributes
   - ❌ Premium badges missing aria-labels
   - ❌ Lock overlays missing aria-labels
   - ❌ Onboarding progress dots missing ARIA

2. **Color Contrast**
   - ❌ text-red-500 fails WCAG AA (3.9:1, needs 4.5:1)
   - ❌ text-amber-500 fails WCAG AA (2.8:1, needs 4.5:1)
   - ❌ Premium badge gradient fails contrast

3. **Icon Accessibility**
   - ⚠️ Decorative icons should have aria-hidden="true"
   - ⚠️ Icon-only buttons may need aria-labels (verify in Lighthouse)

---

## 🎯 RECOMMENDED FIXES

### High Priority Fixes

**1. Fix Progress Bars** (`components/sidebar/usage-stats.tsx`):
```tsx
// Line 153-161: Add ARIA attributes
<div
  role="progressbar"
  aria-valuenow={used}
  aria-valuemin={0}
  aria-valuemax={limit}
  aria-label={`${label}: ${used} of ${limit} used`}
  className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800"
>
  <div
    className={cn(
      "h-full transition-all duration-300",
      getProgressColor(percentage)
    )}
    style={{ width: `${percentage}%` }}
  />
</div>
```

**2. Fix Color Contrast**:
- Change `text-red-500` → `text-red-600` (line 146, 163)
- Change `text-amber-500` → `text-amber-700` (line 147)
- Premium badge: Add `text-shadow: 0 1px 2px rgba(0,0,0,0.5)` for better contrast

**3. Add aria-labels to Premium Badge** (`creator/page.tsx`):
```tsx
// Line 170:
<span
  className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 px-2.5 py-1 text-xs font-semibold text-white shadow-md"
  aria-label="Premium feature - Upgrade required to access"
>
  <svg aria-hidden="true" ...>
    {/* Star icon */}
  </svg>
  Premium
</span>
```

**4. Add aria-label to Lock Overlay** (`creator/page.tsx`):
```tsx
// Line 185:
<div
  className="absolute inset-0 z-20 flex items-center justify-center rounded-xl bg-black/60 backdrop-blur-sm"
  aria-label="Locked - Premium or Business plan required"
>
  <div className="rounded-lg bg-white/95 p-4 dark:bg-gray-800/95">
    <svg aria-hidden="true" ...>
      {/* Lock icon */}
    </svg>
  </div>
</div>
```

**5. Add ARIA to Onboarding Progress** (`onboarding-modal.tsx`):
```tsx
// Line 115:
<div className="flex justify-center gap-2" role="group" aria-label={`Onboarding progress: Step ${currentStep + 1} of ${steps.length}`}>
  {steps.map((_, index) => (
    <div
      key={index}
      aria-label={
        index === currentStep
          ? "Current step"
          : index < currentStep
            ? "Completed step"
            : "Upcoming step"
      }
      className={/* ... */}
    />
  ))}
</div>
```

### Medium Priority Fixes

**6. Hide Decorative Icons**:
- Add `aria-hidden="true"` to all decorative icons (Sparkles, MessageCircle, Search, etc.)

**7. Add aria-labels to Usage Text**:
```tsx
<span
  className={cn("font-semibold", ...)}
  aria-label={`${used} of ${limit} ${label.toLowerCase()} used`}
>
  {used}/{limit}
</span>
```

---

## ✅ SIGN-OFF

### Test Results Summary

| Component | Keyboard | ARIA | Contrast | Screen Reader | Lighthouse | Notes |
|-----------|----------|------|----------|---------------|------------|-------|
| Upgrade Modal | | | | | | |
| Onboarding Modal | | | | | | |
| Usage Counters | | | | | | |
| Premium Badges | | | | | | |
| Pricing Page | | | | | | |
| Agent Library | | | | | | |
| Billing Settings | | | | | | |
| **TOTAL** | | | | | | |

### Critical Issues Found

1.
2.
3.

### Accessibility Score

- Lighthouse Score (Pricing): _____/100
- Lighthouse Score (Agent Library): _____/100
- Lighthouse Score (Billing): _____/100
- Lighthouse Score (Explore): _____/100
- Lighthouse Score (Chat): _____/100

**Average Score**: _____/100
**Target**: 90+

### Recommendations

1.
2.
3.

### Approval

- [ ] All critical accessibility issues resolved
- [ ] Lighthouse scores meet 90+ target
- [ ] Keyboard navigation works correctly
- [ ] Color contrast meets WCAG AA (4.5:1)
- [ ] Screen reader announces content correctly

**Tested By:** _____________
**Date:** _____________
**Sign-off:** _____________

---

## 📝 NOTES

Additional observations or context:

---

**Prepared By**: Claude Sonnet 4.5 (Ralph Autonomous Loop)
**Date**: 2026-01-12
**Ralph Iteration**: 23
