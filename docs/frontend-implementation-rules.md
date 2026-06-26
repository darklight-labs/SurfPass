# SurfPass Front-End Implementation Rules

## Use shadcn/ui as the base component layer

Use shadcn components from `src/components/ui` for primitive UI:
Button, Card, Badge, Table, Tabs, Dialog, Sheet, Select, Input, Label, Alert, Skeleton, Tooltip, Sonner, Empty, Spinner.

## Use lucide-react for icons

Icons must be minimal, consistent, and semantically useful. Avoid decorative icon clutter.

Suggested icons:
- Satellite
- Radio
- MapPin
- Bell
- Users
- CalendarClock
- Eye
- Waves
- Compass
- CheckCircle2
- AlertTriangle
- RefreshCw

## Swiss visual style

Prioritise:
- large page titles
- small uppercase section labels
- thin dividers
- high contrast
- restrained colour
- tabular data
- compact cards
- strong whitespace rhythm

## Avoid

- gradients
- neon
- fake 3D
- excessive animations
- space wallpaper
- dark-mode-only sci-fi dashboard clichés

## Motion

Use motion only for small state transitions:
- cards appearing
- sheet/dialog entry
- subtle loading transitions
- no bouncing, spinning, or playful effects

## Dashboard hierarchy

The dashboard should answer in this order:

1. What is the next useful pass?
2. Is it visual or radio?
3. When does it start?
4. Is it worth acting on?
5. Who is going?
6. Is an alert scheduled?
7. Is the data live, cached, or stale?
