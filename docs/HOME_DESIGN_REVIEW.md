# Reference design implementation

Home follows the supplied reference with a pale settings circle, centered rounded wordmark, profile ring, horizontally scrolling people, outlined Add circle, and lavender avatar rings with the three-second Nudge hold. The logo was removed from the Home header at the user's subsequent request. The circle selector is collapsed initially; Create circle and Join use pale purple pills.

Feed cards have a fine lavender outline, rounded inset photos, author information, working options, and one compact reaction/comment row. Opening the reaction control offers all existing emoji choices; users still cannot react to their own moment. Photo frames use responsive aspect ratios instead of a fixed height.

The latest reference supersedes the previous straight-edged menu request. The bottom menu is a floating rounded pill with an active-tab tint and dot, filled Home icon, and the purple camera circle.

The wordmark uses bundled Nunito Black for softer edges and a purple gradient on “doin?”. The same component appears on Home, moment detail, Get started, and login loading. The question mark has its own container so its two accent strokes stay centered above it. Reserved glyph space prevents native text masks clipping the “u” or question mark. Welcome headings use Nunito ExtraBold; other interface text retains Jakarta Sans.

Profile has a lavender backdrop, a large avatar ring, gradient Edit profile button, separated statistics card, and rounded settings rows with purple icon tiles. Its statistics show approved circle memberships instead of reactions, with a link to circle management. Moments has a larger left-aligned heading, illustrated retention banner, and responsive two-column cards with separate date footers and working options.

Dark is the initial theme when no appearance preference has been saved. Explicit Light, Dark, and System selections continue to persist. The native startup background also uses the dark theme.

The Android widget uses a light rounded card, pastel SVG placeholder, dark name/status, lavender timestamp, and a gradient Nudge button. Its authorized photo downloads, expiry checks, settings links, and account-scoped Nudge action are preserved. The widget picker preview is regenerated from the styled component.

Visual checks in `dist/design-review` use fixture content and initials rather than a signed-in account. Home, moment detail, Profile, and Moments were inspected at 320px and 390px widths, including dark mode; Get started, loading, and widget previews were also checked. These fixture checks complement the Android preview build and do not establish signed-in device behavior.

Version 1.0.2 joins the name as watchudoin? everywhere, preserving the rounded font and purple accent. The download action is an accessible icon. Moment detail shows the original photo ratio and opens a full-photo viewer. Gallery copies include a small watchudoin? watermark in the lower right; cloud retention does not remove copies saved to a device. Feelings start unselected and can be toggled off.
