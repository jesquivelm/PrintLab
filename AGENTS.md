# GENERAL INSTRUCTIONS

## CORE PRINCIPLE

* Minimize token usage.
* Stay strictly within the requested scope.
* Do not modify unrelated files, code, layouts, or logic.
* If requirements are unclear, stop and ask.
* User for login: jesquiv and password: 1234
* Always push after finish

---

## ENCODING RULES

Before editing any file:

* Preserve UTF-8 encoding.
* Do not corrupt accented characters or special symbols.

Preserve:

á, é, í, ó, ú, ñ, ¿, ¡, ₡, $, °

If corrupted text is found:

* Report it before making changes.
* Do not perform global encoding repairs unless explicitly authorized.

---

## EXISTING PATTERNS

Before implementing anything:

* Search for existing references and similar implementations.
* Reuse established system patterns whenever possible.
* Do not create alternative solutions when a standard already exists.
* Maintain consistency with the surrounding code and UI.

---

## UI AND LAYOUT

Apply visual changes only when requested.

Preserve:

* Existing structure
* Alignment
* Margins
* Padding
* Component sizing

Do not redesign screens without authorization.

Avoid:

* Unexpected layout shifts
* Element overlap
* Container resizing caused by labels
* Visual inconsistencies

---

## NUMERIC AND CURRENCY FIELDS

Follow the existing system pattern.

* Do not create additional fields.
* Do not place units outside inputs.
* Reuse existing currency and unit rendering behavior.
* Maintain existing formatting standards.

---

## ICONS

Use the centralized icon system.

* Do not create temporary or isolated icon implementations.
* Reuse existing icon rendering mechanisms.
* Respect existing icon configuration and styling rules.

---

## DEVELOPMENT RULES

Always:

* Analyze impact before modifying.
* Avoid breaking existing functionality.
* Avoid assumptions.
* Do not add dependencies without authorization.
* Do not remove working code without justification.
* Do not modify anything outside the requested scope.

If a requirement is unclear:

* Stop and ask.

---

## TESTING

Testing is mandatory whenever testing is possible.

Testing depth must match the size and risk of the change.

Examples:

* Text change → basic verification.
* UI change → visual verification.
* Logic change → functional verification.
* Data or workflow change → affected workflow verification.

Before completion:

* Verify the requested change works.
* Verify related functionality was not obviously broken.
* Report exactly what was tested.
* Report test results.
* Report what could not be tested.

If testing cannot be performed:

* Explicitly report it.
* Do not assume success.
* Do not claim validation.

---

## CODE COMMENTS

* Do not add unnecessary comments.
* Do not leave commented-out code.
* Only add comments when explicitly requested or truly necessary.

---

## HONESTY

Always:

* Report failures immediately.
* Report blockers clearly.
* Report limitations honestly.
* Never claim completion without evidence.
* Never claim validation without testing.
* Never silently change scope.

---

## TASK COMPLETION

Always report:

* Modified files
* What was changed
* What was tested
* Test results
* What could not be tested
* Blockers encountered
* Additional required actions, if any

---

## FINAL PRINCIPLE

It is better to report a real limitation than provide a false confirmation.

It is better to report a blocker than hide it.

Never declare success without evidence.
