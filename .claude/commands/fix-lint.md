Run `npm run lint` and fix every reported error and warning, then commit the fixes.

## Steps

### 1. Run lint and capture output

```bash
npm run lint 2>&1
```

If lint exits 0 with no output, report "No lint issues found" and stop — do not create an empty commit.

### 2. Fix all reported issues

Work through each file that has errors or warnings. Read each file before editing it.

Common patterns and how to fix them:

**`react/jsx-no-comment-textnodes`** — A string like `// FOO` appears as raw text inside JSX.
→ Wrap it: `{'// FOO'}`

**`@typescript-eslint/no-unused-vars`** — A variable, function, or import is declared but never used.
→ Remove the declaration entirely. Do not prefix with `_` unless the variable is a required destructuring placeholder.

**`react-hooks/set-state-in-effect`** — `setState` called directly inside a `useEffect` body.
→ If the effect is resetting state in response to a user action (e.g. a search input change), move the reset into the event handler that triggers the state change instead of using an effect. If the effect is accumulating time-series data (e.g. history/sparkline buffers that must update on every tick), keep the pattern and add `// eslint-disable-next-line react-hooks/set-state-in-effect` on the line before the setState call — this is a legitimate exception.

**`react-hooks/refs`** — `ref.current` is read or written during render (outside of effects or event handlers).
→ Move the mutation into a `useEffect`. Return a state value instead of the ref directly.

**`react/jsx-no-useless-fragment`** — An unnecessary `<>...</>` wrapper.
→ Remove the fragment; return the child directly.

**`@typescript-eslint/no-explicit-any`** — `any` used in a type annotation.
→ Replace with the narrowest correct type. If the correct type is genuinely unknown at that boundary, use `unknown` instead of `any`.

### 3. Verify

```bash
npm run lint 2>&1
```

If new errors appear (introduced by your edits), fix them too. Repeat until lint exits cleanly.

### 4. Commit

Stage only the files you changed (never `git add -A`):

```bash
git add <file1> <file2> ...
```

Use a commit message that:
- Starts with `Fix:` 
- Lists each file and what was fixed, grouped by rule
- Ends with the standard Co-Authored-By trailer

Example:

```
Fix: resolve ESLint errors and warnings

- page.tsx: replace setState-in-effect with event handler; wrap decorative // text in JSX expressions
- FooNode.tsx: remove unused fmtNum helper
- BarFields.tsx: remove unused getLabel function
- ArcGauge.tsx: remove unused startAngle/endAngle variables

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
```

Pass the message via HEREDOC to preserve formatting:

```bash
git commit -m "$(cat <<'EOF'
Fix: ...

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```
