# GENERAL INSTRUCTIONS (GLOBAL RULES FOR ANY PROJECT)

# CORE PRINCIPLE

Before modifying any file:

1. Minimize token usage at all costs. Do not waste tokens on tasks, explanations, refactors, or analyses that were not explicitly requested.
2. Create a timestamped backup of the exact file that will be modified.
3. Verify that the backup was successfully created before proceeding.
4. Only after backup verification, apply the requested change.
5. At task completion, report the exact backup path created.
6. If the project is connected to Git, always commit and push the changes to keep the repository updated.
7. Final formatting must remain fully human-readable. Always verify spacing, margins, alignment, and font visibility for both light and dark themes.

Work with extreme caution and respect the existing system architecture. Do not modify anything outside the requested scope.

---

# WORK RULES

Before editing any file, strictly verify and preserve UTF-8 encoding.

Never corrupt accented characters, ñ, opening punctuation, currency symbols, or special characters into mojibake sequences such as:

- Ã¡
- Ã©
- Ã±
- â
- Â
- �

If corrupted text already exists:
- Report it first.
- Specify exactly which files contain corruption.
- Do NOT automatically fix encoding issues unless explicitly authorized.

When editing visible application text, forms, labels, quotations, or documents:

- Preserve real Spanish characters:
  á, é, í, ó, ú, ñ, ¿, ¡, ₡, $, °
- Do not change file encoding.
- Do not perform mass encoding conversions.
- Do not create global “text repair” functions without authorization.
- Only modify the exact requested text.
- After editing, scan for residual corruption characters:
  Ã, Â, â, �
  and report if any remain.

Before finishing, explicitly validate and report:
- Which texts were modified.
- Which files were modified.
- Whether corrupted characters were found.
- Whether anything remains pending.

---

# LAYOUT AND FORMAT RULES

Apply formatting fixes only when explicitly requested.

Strictly preserve:
- Layout
- Widths
- Heights
- Margins
- Padding
- Alignment
- Existing structure

Do not redesign or restructure existing UI components.

All labels must remain on a single line.
Never allow line wrapping.

If text does not fit:
- Visually truncate it, or
- Abbreviate it intelligently,
but NEVER expand containers or alter layout height.

Abbreviations must remain semantically clear.
Prefer concise labels of 1–2 words whenever possible.

Maintain perfectly consistent:
- Horizontal alignment
- Vertical alignment
- Spacing
- Field positioning

No element should:
- Shift unexpectedly
- Overlap
- Trigger layout reflow
- Resize neighboring components

Label content must NEVER modify container dimensions.

---

# NUMERIC AND CURRENCY FIELD RULES

For numeric fields, measurement units, and currency symbols:

STRICT REQUIREMENTS:

- Do not create extra fields.
- Do not place units outside the input.
- Do not use side elements beside the field.
- Do not alter existing field structure.

You MUST follow the existing system pattern where:
- Units and currency symbols appear as visual overlays INSIDE the field.

This applies to:
- Units (kg, m, %, etc.)
- Currency symbols (₡, $, etc.)

The symbol or unit must:
- Stay visually inside the field
- Align correctly left or right
- Never interfere with numeric values
- Remain purely visual

The input itself must remain numerically pure.

Maintain complete consistency with existing fields already using this pattern.
Do not reinvent the solution.
Do not create alternative implementations.

If an equivalent field already exists in the system:
- Find it first.
- Copy its exact:
  - Structure
  - Classes
  - Behavior
  - Visual formatting

If suffix rendering requires overlays/masks:
- Reuse the same existing implementation.
- Never improvise similar alternatives.

Before approving a change:
- Compare visually against the original reference.
- Self-correct until identical.

---

# FIELD FORMAT CONSISTENCY

All fields must follow the system's established formatting rules.

If unsure:
- Inspect nearby fields.
- Replicate their behavior exactly.

Numeric fields:
- Preserve the existing thousands separator format.
- Maintain spacing conventions already used by the system.

Currency fields:
- Always display the currency symbol.
- Respect the same numeric formatting standards.

---

# UI / UX RULES

Avoid meaningless comments or summaries that provide no value.

Separate information containers properly.
Avoid cramped layouts.
Proper spacing and breathing room are mandatory.

Minimize token usage aggressively.
Use the smallest possible amount of tokens required to complete the requested task.
This rule is mandatory.

Buttons already have established design patterns.
If uncertain:
- Reference existing screens such as:
  - Member search
  - Quotations
  - Existing system forms

Dark mode rules:
- Standardize scrollbar colors to discreet tones.
- Avoid bright or visually aggressive scrollbars.
- Avoid unnecessary shadows or background panels.
- Especially avoid artificial backgrounds under comments unless requested.

Icons:
- Avoid unnecessary icon borders or background fills.
- Respect the existing icon system configuration.
- If a new icon is required:
  - Add it through the existing icon catalog/configuration system.

Field sizing:
- Allocate space logically.
- Small fields should not consume excessive width.
- Large text areas (comments, observations) should receive proportionally more space.

Improve spacing between objects to avoid visual collisions.

---

# DEVELOPMENT RULES

Always:
- Analyze impact before modifying.
- Warn if changes may affect the system.
- Ask when uncertain.
- Never assume requirements.
- Never improvise solutions.
- Never alter formats without authorization.
- Respect existing design and logic.
- Avoid breaking existing functionality.
- Never modify outside the requested scope.
- Never skip steps.
- Report incomplete tasks.
- Admit limitations before proceeding.
- Recommend backups for risky operations.
- Validate functionality after changes.
- Close connections, processes, and temporary resources used.
- Avoid unnecessary resource consumption.
- Warn before impacting users or live services.
- Never add dependencies without authorization.
- Never remove working code without justification.

---

# CODE COMMENTS

- Do not add unnecessary comments.
- Do not leave commented-out code.
- Do not leave temporary notes.
- Only comment code if explicitly requested or absolutely necessary.

---

# TEXT AND CONTENT RULES

- Use correct and consistent language.
- Maintain proper spelling.
- Never improvise texts.
- Do not rename labels without authorization.
- Avoid problematic characters.

---

# DESIGN RULES

- Preserve existing formatting.
- Maintain visual consistency.
- Never redesign without authorization.
- Follow existing patterns.
- If no clear reference exists, stop and ask.

---

# SECURITY RULES

- Recommend backups before critical changes.
- Never execute destructive actions without warning.
- Never delete data without authorization.
- Stop immediately if critical risks are detected.

---

# TESTING AND VALIDATION

- Test every implemented change.
- Verify related functionality was not broken.
- Never claim functionality without validation.
- Clearly state what could not be tested.

---

# TASK COMPLETION (MANDATORY FORMAT)

Always report:

- What was modified
- What was tested
- Test results
- What could not be tested
- Blockers encountered
- Modified files
- Additional required steps

---

# EXISTING FORMAT RULE

Before implementing anything:

- Search for existing references inside the system.
- Reuse established patterns.
- Maintain complete consistency.
- Never invent a new solution if one already exists.
- Stop and ask if clarity is insufficient.

---

# REAL VALIDATION

- Never declare tasks complete without validation.
- Never assume outcomes.
- Report failures immediately.
- Never hide errors.
- Clearly report blockers.

---

# HONESTY AND SCOPE

- Never claim full compliance if partial.
- Explicitly state what was completed and what was not.
- Never change scope silently.
- Prioritize explicit user instructions above assumptions.
- Verify before confirming success.

---

# FINAL PRINCIPLE

It is better to report real failures than fake solutions.
It is better to admit blockers than hide them.
Never declare success without evidence.