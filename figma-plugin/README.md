# Patchwork Prototype Builder (Figma plugin)

Turns the 29 Patchwork screen PNGs into a fully clickable Figma prototype.

## Run it (Figma desktop app)
1. Open any Figma design file (a new blank one is fine).
2. Menu → **Plugins → Development → Import plugin from manifest…** → pick `figma-plugin/manifest.json`.
3. Menu → **Plugins → Development → Patchwork Prototype Builder**.
4. Wait ~10 s. Two pages are created:
   - **Patchwork — Interactive Prototype**: 29 wired screens, plus components and toasts below them.
   - **Patchwork — Submission docs**: cover, declarations, inventory, traceability.
5. On the prototype page, click **▶ Present** and choose the flow **"Patchwork — full prototype"**. It starts at 01 Landing.

## What's interactive
- **Navigation**: logo, all 6 sidebar links, Back (uses history), the profile menu, every primary button, and the sample cards. Both journeys work end to end (A: 05→09→10→11→29→12→13→20→21→22→25; B: 05→14→15→16→17→20).
- **Selections you can click on and off**: interest and skill chips (04), category and condition chips (07), suggested goals (14), resource cards (09), preference cards (11), route cards (16), and guide steps (21).
- **Checkboxes**: Terms (02) and Remember me (03).
- **Tap-to-fill inputs**: click a field on 02, 03 or 07 and it fills with sample data.
- **Edge states**: 06 links to Empty (27) and Error (28). Retry goes to Loading (29), which moves to Discover Ideas (12) on its own after 2.5 s.
- **Toasts** explain screens the demo leaves out, such as Forgot password, other resource or idea details, and settings editors. A toast closes when clicked or after 2.8 s.

## Editing
- To change a screen image, replace its PNG and run `python3 build.py`, then run the plugin again.
- Each hotspot is a transparent frame named `⟶ <label>`. You can retarget it in Figma's Prototype panel.
- The interactive components live in **⚙︎ Prototype components**. Restyle the `State=On` variants there and every screen updates.
