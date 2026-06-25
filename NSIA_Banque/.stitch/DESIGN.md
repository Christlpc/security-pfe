# Design System: NSIA Banque Premium Portal
**Project ID:** nsia-banque-premium-portal

## 1. Visual Theme & Atmosphere
The design atmosphere is **Financial Enterprise Grade**, **Prestigious**, and **Dense**. It prioritizes high-density data visualization, crisp borders, and a minimized amount of empty white space by replacing massive open areas with subtle background cards and structured grids. The system is designed to convey security, authority, and financial expertise.

## 2. Color Palette & Roles
* **Deep Navy Blue (#0B192C)**: Primary branding, headers, key text, and primary button gradients.
* **Navy Steel (#1E3E62)**: Secondary branding, accents, borders, and interaction hover states.
* **Amber Gold (#D97706)**: Accent highlights, warning/pending states, and premium badge fills.
* **Emerald Mint (#10B981)**: KPI success colors, trend indications, and approved status indicators.
* **Slate Gray (#64748B)**: Neutral body copy, secondary icons, and muted status texts.
* **Canvas Pearl (#F8FAFC)**: Muted background canvas that replaces pure white (#FFFFFF) to reduce eye strain.

## 3. Typography Rules
* **Font Family**: Inter, Outfit, or standard high-quality geometric sans-serif.
* **Headers**: Heavy font weights (Bold to Extra-Bold, `font-bold` to `font-extrabold`) with tight letter-spacing (`tracking-tight`) in Navy Blue.
* **Body**: Medium-density text with subtle letter-spacing for high readability.

## 4. Component Stylings
* **Buttons**:
  - *Primary*: Deep Navy Blue gradient (`from-[#0B192C] to-[#1E3E62]`), white text, sharp or subtly rounded corners (`rounded-lg`), bold text.
  - *Secondary*: Bordered with Navy Steel (`border-[#1E3E62]`), text Navy Steel, background transparent or 5% opacity Navy.
* **Cards/Containers**:
  - *Shape*: Subtly rounded corners (`rounded-xl` or `rounded-lg`).
  - *Background*: Pure white or extremely soft pearl gray with a border of 1px light gray/slate (`border-slate-100`).
  - *Shadows*: Whisper-soft, almost flat diffused shadows (`shadow-sm`) to avoid floating elements.
* **Inputs/Forms**:
  - *Border*: Consistent thin borders in light slate (`border-slate-200`).
  - *Focus State*: Ring highlight using Navy Steel (`ring-[#1E3E62]`).

## 5. Layout Principles
* **Density**: Higher information density, compact paddings (`py-3`, `px-4`), and grids to structure information efficiently.
* **Contrast**: High visual contrast between headers and fields, utilizing colored container fills (`bg-slate-50`) to separate sections rather than margins alone.
