# Mobile Responsiveness Verification Checklist - US-33

**Purpose**: Verify that all tier-related UI components work correctly on mobile devices (375px width).

**Testing Device/Emulation**:
- Target width: **375px** (iPhone SE, iPhone 12/13/14 mini)
- Browser: Chrome/Firefox/Safari DevTools
- Test in both portrait and landscape orientations

**Tester**: _____________
**Date**: _____________
**Environment**: _____________

---

## 📱 Testing Setup

### Browser DevTools Method

**Chrome:**
1. Open DevTools (F12 or Cmd+Option+I)
2. Click "Toggle device toolbar" icon (Cmd+Shift+M)
3. Select "iPhone SE" or set custom width to 375px
4. Test in both portrait (375px) and landscape (667px)

**Firefox:**
1. Open DevTools (F12 or Cmd+Option+I)
2. Click "Responsive Design Mode" (Cmd+Option+M)
3. Set width to 375px x 667px
4. Test portrait and landscape

**Safari:**
1. Enable "Develop" menu in Preferences
2. Develop → Enter Responsive Design Mode
3. Select "iPhone SE" or custom 375px width

---

## ✅ TEST SUITE 1: PRICING PAGE

**URL**: `/pricing`

### Layout & Stacking

- [ ] **Page loads without horizontal scroll**
  - No content extends beyond 375px width
  - No side-to-side scrolling needed
  - All elements fit within viewport

- [ ] **Header section readable**
  - "Choose Your Plan" heading visible
  - Subheading text legible (not cut off)
  - Proper padding/margins

- [ ] **Pricing cards stack vertically**
  - Expected: 3 cards (Free, Premium, Business) stack in single column
  - Cards appear in order: Free → Premium → Business
  - Full width cards (no side margins causing horizontal scroll)

### Typography

- [ ] **Headings legible**
  - Plan names (Free, Premium, Business) readable
  - Prices ($0, $29, $99) clearly visible
  - Font sizes appropriate for mobile (not too small)

- [ ] **Body text readable**
  - Feature lists have sufficient line height
  - Text doesn't overflow containers
  - Minimum font size: 14px (check with DevTools)

### Spacing & Padding

- [ ] **Adequate padding around content**
  - Cards have proper spacing between them
  - Content not touching screen edges
  - Minimum 16px padding from viewport edges

- [ ] **Feature lists properly spaced**
  - Checkmarks/X icons visible
  - Text aligned with icons
  - Sufficient gap between list items

### Touch Targets

- [ ] **Buttons meet minimum size (44px x 44px)**
  - "Choose Free", "Subscribe to Premium", "Subscribe to Business" buttons
  - Buttons easy to tap without accidentally hitting adjacent elements
  - Adequate spacing between buttons if multiple visible

- [ ] **Interactive elements have proper spacing**
  - No buttons/links overlapping
  - Minimum 8px gap between tappable elements

### Comparison Table (if present)

- [ ] **Feature comparison readable**
  - Table scrollable horizontally if needed
  - Headers sticky/visible while scrolling
  - All features visible and readable

---

## ✅ TEST SUITE 2: MODALS

Test each modal type at 375px width.

### Upgrade Modal

**Trigger**: Click "Upgrade" when hitting free tier limit

- [ ] **Modal fits viewport**
  - Modal width appropriate for mobile (full width or max-width)
  - No horizontal scroll within modal
  - Proper padding (16px minimum)

- [ ] **Content readable**
  - Heading: "Upgrade Required" or similar
  - Body text explaining limit reached
  - Feature comparison visible

- [ ] **Close button accessible**
  - "X" or "Close" button visible and tappable (44px minimum)
  - ESC key closes modal (keyboard accessibility)

- [ ] **Pricing cards in modal**
  - If modal shows pricing, cards stack vertically
  - All pricing information visible without scrolling
  - CTA buttons ("Upgrade to Premium") tappable

- [ ] **Buttons properly sized**
  - Primary CTA buttons minimum 44px height
  - Full width or centered with adequate width
  - Proper spacing between multiple buttons

### Onboarding Modal (if applicable)

**Trigger**: First-time user login

- [ ] **Modal fits viewport**
  - Welcome message readable
  - Tour steps/slides visible
  - Navigation arrows/dots accessible

- [ ] **Swipe/navigation works**
  - Can advance through slides
  - Skip button accessible
  - Progress indicator visible

### Payment Failure Banner/Modal

**Trigger**: Subscription in past_due status

- [ ] **Banner displays correctly**
  - Warning text readable
  - Countdown timer visible
  - "Update Payment Method" button accessible

- [ ] **Modal (if triggered) fits**
  - Payment update instructions visible
  - Stripe portal link accessible

---

## ✅ TEST SUITE 3: USAGE COUNTERS (Sidebar)

**Location**: Left sidebar / mobile drawer

### Sidebar on Mobile

- [ ] **Sidebar accessible**
  - Hamburger menu or sidebar toggle visible
  - Sidebar opens smoothly (slide-in animation)
  - Overlay darkens background when open

- [ ] **Sidebar width appropriate**
  - Sidebar doesn't cover entire screen (if slide-in)
  - OR full-screen with proper close button (if full overlay)
  - Content within sidebar not cut off

### Usage Stats Display

- [ ] **Reports counter visible**
  - Format: "X/Y Reports" (e.g., "8/20 Reports")
  - Icon (sparkles) aligned with text
  - Progress bar (if present) visible and accurate

- [ ] **Messages counter visible**
  - Format: "X/Y Messages" (e.g., "450/1000 Messages")
  - Icon (message) aligned with text
  - Progress bar shows correct percentage

- [ ] **Searches counter visible**
  - Format: "X/Y Searches" (e.g., "22/50 Searches")
  - Icon (search) aligned with text
  - Progress bar shows correct percentage

- [ ] **Upgrade button accessible (if free tier)**
  - Button visible below counters
  - Minimum 44px height
  - Text: "Upgrade Plan" or similar

### Counter Styling

- [ ] **Progress bars render correctly**
  - Bar width represents usage percentage
  - Colors: green (<75%), amber (75-90%), red (>90%)
  - Bar height sufficient (minimum 4px)

- [ ] **Icons sized appropriately**
  - Not too large (max 24px)
  - Not too small (min 16px)
  - Aligned with text baseline

---

## ✅ TEST SUITE 4: BILLING/ACCOUNT SETTINGS

**URL**: `/[workspaceid]/settings/billing`

### Settings Page Layout

- [ ] **Page header readable**
  - "Billing" or "Account Settings" heading
  - Breadcrumbs (if present) not cut off

- [ ] **Subscription info card**
  - Current tier displayed: "Free", "Premium", or "Business"
  - Subscription status visible
  - Next billing date (if applicable) readable

### Billing Details

- [ ] **Usage statistics section**
  - All usage metrics visible:
    - Reports: X/Y
    - Messages: X/Y
    - Searches: X/Y
  - Numbers don't overlap or wrap awkwardly

- [ ] **Buttons accessible**
  - "Manage Subscription" button minimum 44px height
  - "Update Payment Method" button (if applicable) tappable
  - "View Billing History" button accessible
  - Buttons stack vertically with proper spacing

### Payment Method Section

- [ ] **Card details readable**
  - Card brand and last 4 digits visible
  - Expiration date not cut off
  - "Update" button accessible

---

## ✅ TEST SUITE 5: AGENT LIBRARY (Creator Page)

**URL**: `/[workspaceid]/creator`

### Agent Grid

- [ ] **Agents display in responsive grid**
  - Grid: 1 column on mobile (375px)
  - Cards stack vertically
  - No horizontal scroll

- [ ] **Agent cards readable**
  - Agent name/title visible
  - Description text legible (not too small)
  - Icons/thumbnails appropriately sized

### Lock Icons (Free Tier)

- [ ] **Lock overlay visible on locked agents**
  - Lock icon clearly visible
  - "Premium" badge readable
  - Doesn't obscure agent preview image

- [ ] **Tap on locked agent shows upgrade modal**
  - Modal triggered correctly
  - Modal displays as expected (see Modal tests above)

### Create Agent Button

- [ ] **"Create Agent" button accessible**
  - Button visible (not hidden off-screen)
  - Minimum 44px height
  - Full width or centered with adequate width

---

## ✅ TEST SUITE 6: PROPERTY REPORTS

**URL**: `/[workspaceid]/explore` (after generating report)

### Report Viewer

- [ ] **Report tabs accessible**
  - Tabs: Overview, Roof, Solar, Images, Chat
  - Tabs scrollable horizontally if needed
  - Active tab clearly indicated

- [ ] **Overview tab content**
  - Property details readable
  - Metrics (area, facets, etc.) not cut off
  - Images fit within viewport (responsive sizing)

- [ ] **Roof tab content**
  - AI summary text readable
  - Key findings list properly formatted
  - Condition cards stack vertically

- [ ] **Solar tab content**
  - Solar metrics cards stack vertically
  - Financial analysis readable
  - No horizontal scroll needed

- [ ] **Images tab**
  - Images scale to fit mobile viewport
  - Navigation arrows (prev/next) tappable
  - Thumbnail strip scrollable

- [ ] **Chat tab**
  - Chat input field visible and usable
  - Messages display correctly
  - Send button accessible (44px minimum)

---

## ✅ TEST SUITE 7: EMPTY STATES

### Chat Empty State

**Location**: Chat page when no messages

- [ ] **Empty state centered and readable**
  - Icon visible
  - "Start a conversation" text readable
  - Example prompts (if present) stack vertically
  - Prompt buttons tappable (44px minimum)

### Explore Empty State

**Location**: Explore page with no reports

- [ ] **Empty state message visible**
  - "Analyze your first property" text readable
  - CTA button accessible

### Locked Agent State

**Location**: Agent library on free tier

- [ ] **Lock state message clear**
  - "Upgrade to access agents" text readable
  - Upgrade button accessible

---

## ✅ TEST SUITE 8: CROSS-DEVICE CHECKS

### Orientation Changes

- [ ] **Portrait mode (375px width)**
  - All above tests pass in portrait

- [ ] **Landscape mode (667px width)**
  - Layout adjusts appropriately
  - Content still readable
  - No elements cut off

### Different Mobile Widths

Test at multiple widths to ensure responsive breakpoints work:

- [ ] **320px (iPhone SE, small phones)**
  - All content visible
  - No horizontal scroll
  - Text still readable

- [ ] **414px (iPhone Plus, larger phones)**
  - Layout utilizes extra space appropriately
  - Grid adjusts if applicable (still single column expected)

---

## ✅ TEST SUITE 9: TOUCH & INTERACTION

### Touch Targets

- [ ] **All buttons minimum 44px x 44px**
  - CTA buttons (Upgrade, Subscribe, etc.)
  - Close/cancel buttons
  - Navigation buttons

- [ ] **Adequate spacing between tappable elements**
  - Minimum 8px gap between buttons
  - No accidental taps on adjacent elements

### Scrolling

- [ ] **Vertical scrolling smooth**
  - No janky/laggy scrolling
  - Scroll position maintained when navigating

- [ ] **Horizontal scrolling only where intended**
  - Tabs can scroll horizontally if needed
  - No full-page horizontal scroll

### Forms & Inputs

- [ ] **Input fields accessible**
  - Chat input field usable
  - Mobile keyboard doesn't obscure input
  - Can scroll to see input after keyboard appears

---

## 🐛 ISSUES FOUND

Document any mobile responsiveness issues:

### Issue 1: [Title]
- **Component:** (e.g., Pricing page, Upgrade modal, etc.)
- **Screen Width:** (e.g., 375px, 320px, etc.)
- **Severity:** Critical / High / Medium / Low
- **Description:**
- **Expected Behavior:**
- **Actual Behavior:**
- **Screenshot/Video:**

### Issue 2: [Title]
- **Component:**
- **Screen Width:**
- **Severity:**
- **Description:**
- **Expected Behavior:**
- **Actual Behavior:**
- **Screenshot/Video:**

---

## 📊 CODE REVIEW FINDINGS

### Responsive Classes Used

✅ **Pricing Page** (`app/[locale]/pricing/page.tsx`)
- Line 65: `sm:px-6 lg:px-8` - Responsive padding
- Line 77: `md:grid-cols-3` - Grid stacks on mobile, 3 columns on tablet+
- Cards use `flex flex-col` for vertical stacking

✅ **Upgrade Modal** (`components/modals/upgrade-modal.tsx`)
- Line 69: `md:grid-cols-3` - Pricing cards stack on mobile

✅ **General Pattern**
- Most components use Tailwind's responsive prefixes
- Default styles are mobile-first
- Breakpoints scale up with `sm:`, `md:`, `lg:`, `xl:`

### Potential Issues (To Verify)

⚠️ **Usage Stats Component** (`components/sidebar/usage-stats.tsx`)
- No explicit responsive classes found
- May need width constraints for mobile sidebar
- Progress bars should scale to container width

⚠️ **Touch Targets**
- Button heights need manual verification (44px minimum)
- Some buttons may use default padding (need to check actual rendered size)

⚠️ **Text Sizes**
- Most components use Tailwind text classes (`text-xs`, `text-sm`, etc.)
- Minimum should be `text-sm` (14px) for readability

---

## ✅ SIGN-OFF

### Test Results Summary

| Component | Total Tests | Passed | Failed | Blocked | Notes |
|-----------|-------------|--------|--------|---------|-------|
| Pricing Page | | | | | |
| Modals | | | | | |
| Usage Counters | | | | | |
| Billing Settings | | | | | |
| Agent Library | | | | | |
| Property Reports | | | | | |
| Empty States | | | | | |
| Touch & Interaction | | | | | |
| **TOTAL** | | | | | |

### Critical Issues

List any critical mobile issues that block usage:

1.
2.
3.

### Recommendations

Based on mobile testing:

1.
2.
3.

### Approval

- [ ] All critical tests passed
- [ ] Known issues documented
- [ ] Mobile experience is acceptable for [production/beta/etc.]

**Tested By:** _____________
**Date:** _____________
**Sign-off:** _____________

---

## 📝 NOTES

Additional observations or context:
