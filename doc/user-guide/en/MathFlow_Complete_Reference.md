# MathFlow Complete Reference Guide

> The definitive reference for all MathFlow features, snippets, and mathematical symbols.

**Version**: 1.0 | **Last Updated**: 2026-02-26

---

## Table of Contents

1. [Quick Start](#1-quick-start)
2. [Interface Guide](#2-interface-guide)
3. [Text Editing](#3-text-editing)
4. [Math Mode — Entering & Exiting](#4-math-mode)
5. [Snippet System](#5-snippet-system)
6. [Complete Snippet Reference](#6-complete-snippet-reference)
7. [Greek Letters](#7-greek-letters)
8. [Operators & Relations](#8-operators--relations)
9. [Arrows](#9-arrows)
10. [Set Theory & Logic](#10-set-theory--logic)
11. [Calculus & Analysis](#11-calculus--analysis)
12. [Linear Algebra & Matrices](#12-linear-algebra--matrices)
13. [Number Fields & Algebraic Structures](#13-number-fields--algebraic-structures)
14. [Decorations & Accents](#14-decorations--accents)
15. [Fractions, Roots & Powers](#15-fractions-roots--powers)
16. [Brackets & Delimiters](#16-brackets--delimiters)
17. [Functions](#17-functions)
18. [Environments](#18-environments)
19. [Theorem Environments](#19-theorem-environments)
20. [Math Formatting](#20-math-formatting)
21. [Additional LaTeX Symbols (No Snippet — Type Directly)](#21-additional-latex-symbols)
22. [AI Assistant](#22-ai-assistant)
23. [LaTeX Export](#23-latex-export)
24. [Keyboard Shortcuts](#24-keyboard-shortcuts)
25. [Tips for Lecture-Speed Notes](#25-tips-for-lecture-speed-notes)

---

## 1. Quick Start

### First-Time Setup

```
cd mathflow && npm install && npm run dev        # Frontend → http://localhost:5173
cd mathflow/server && npm install && npm run dev  # Backend → http://localhost:3001
```

### 30-Second Tutorial

1. Click **+** in the sidebar → create a notebook
2. Click **+ New Note** → create a note
3. Type text normally in the editor
4. Type `mk` → inline math editor opens (yellow box) → type LaTeX → press **Enter**
5. Type `dm` → display math editor opens → type LaTeX → press **Ctrl+Enter**
6. Snippets auto-expand as you type: `phi` → `\varphi`, `OO` → `\infty`, `sr` → `^2`

---

## 2. Interface Guide

### Layout

```
┌──────────┬──────────────────────────────────┬──────────┐
│          │        Toolbar                    │          │
│ Sidebar  ├──────────────────────────────────┤ Snippet  │
│ (dark)   │                                  │ Panel    │
│          │        Editor                     │ (opt.)   │
│ Notebooks│                                  │          │
│ & Notes  │                                  │          │
│          │                                  │          │
└──────────┴──────────────────────────────────┴──────────┘
```

### Sidebar (Left)
- **Create notebook**: Click **+** next to "Notebooks"
- **Create note**: Expand a notebook, click **+ New Note**
- **Rename**: Hover over name → click ✎ pencil icon (or double-click)
- **Delete**: Hover → click × button
- **Collapse sidebar**: Click ‹ in header

### Toolbar (Top)
- **B** / *I* / U — Bold, Italic, Underline
- **Paragraph / Heading** dropdown — select text level (updates on cursor position)
- **∑ Inline** / **∫ Display** — insert math nodes
- **• List** / **1. List** / **" Quote** — list & quote formatting
- **+ Environment** — insert theorem/proof/definition blocks
- **AI** — open AI assistant (Ctrl+K)
- **Export .tex** — download LaTeX file

### Snippet Panel (Right)
- Click **Snippets** in the header bar to toggle
- Searchable reference of all 190+ snippets
- Shows trigger, result, and type (auto/tab)

---

## 3. Text Editing

### Headings

| Action | How |
|--------|-----|
| Heading 1 | Select "Heading 1" from toolbar dropdown |
| Heading 2 | Select "Heading 2" from toolbar dropdown |
| Heading 3 | Select "Heading 3" from toolbar dropdown |
| Back to paragraph | Select "Paragraph" from toolbar dropdown |

### Text Formatting

| Format | Shortcut | Toolbar |
|--------|----------|---------|
| **Bold** | Ctrl+B | Click **B** |
| *Italic* | Ctrl+I | Click *I* |
| Underline | Ctrl+U | Click U |

### Lists & Blocks

| Element | How |
|---------|-----|
| Bullet list | Click "• List" in toolbar |
| Ordered list | Click "1. List" in toolbar |
| Block quote | Click "" Quote" in toolbar |

---

## 4. Math Mode

### Entering Math Mode

| Method | What it does | Where you type it |
|--------|-------------|-------------------|
| Type `mk` | Opens **inline** math (within paragraph) | In the text editor |
| Type `dm` | Opens **display** math (centered, own line) | In the text editor |
| Click **∑ Inline** | Opens inline math | Toolbar button |
| Click **∫ Display** | Opens display math | Toolbar button |

### What Happens

1. A yellow editing box appears
2. Type LaTeX inside the yellow box
3. For **display math**: a live preview shows below the textarea
4. Snippets work inside the yellow box (e.g., `phi` → `\varphi`)

### Exiting Math Mode

| Math type | How to exit |
|-----------|------------|
| Inline math | Press **Enter** or **Escape** |
| Display math | Press **Ctrl+Enter** or **Escape** |
| Either | Click anywhere outside the yellow box |

### Re-editing Math

- Click on any rendered math → the yellow editor reopens with your previous LaTeX
- Edit the LaTeX → exit to see updated rendering

### Deleting Math

- Click the math node to enter editing mode
- Select all text and delete, or press **Backspace** on empty → deletes the node

---

## 5. Snippet System

### How Snippets Work

Snippets are shortcuts that convert short text into LaTeX commands. There are two types:

| Type | How it fires | Example |
|------|-------------|---------|
| **Auto-expand** | Fires immediately as you type the trigger | `sr` → `^2` (instant) |
| **Tab-expand** | Type the trigger, then press **Tab** | `sum` + Tab → `\sum_{}^{}` |

### Where Snippets Work

- In the **text editor** (for mode-switching like `mk`, `dm`)
- Inside **inline math** yellow editor
- Inside **display math** textarea

### Word Boundary

Some snippets require a word boundary before the trigger (space, start of line, or non-alphanumeric character). This prevents false triggers. For example, `sin` requires a boundary so that typing "basin" doesn't trigger `\sin`.

### Tab Stops

Some snippets place your cursor at a specific position after expansion:
- `td` → `^{}` (cursor inside braces)
- `sum` + Tab → `\sum_{}^{}` (cursor at first `{}`)

---

## 6. Complete Snippet Reference

### Mode Switching (Text Mode)

| Trigger | Type | Result | Description |
|---------|------|--------|-------------|
| `mk` | auto | Opens inline math node | Enter inline math mode |
| `dm` | auto | Opens display math node | Enter display math mode |

---

## 7. Greek Letters

### Full Names (Auto-expand — just type the name)

| Trigger | Result | Rendered |
|---------|--------|----------|
| `alpha` | `\alpha` | α |
| `beta` | `\beta` | β |
| `gamma` | `\gamma` | γ |
| `Gamma` | `\Gamma` | Γ |
| `delta` | `\delta` | δ |
| `Delta` | `\Delta` | Δ |
| `epsilon` | `\varepsilon` | ε |
| `zeta` | `\zeta` | ζ |
| `eta` | `\eta` | η |
| `theta` | `\theta` | θ |
| `Theta` | `\Theta` | Θ |
| `iota` | `\iota` | ι |
| `kappa` | `\kappa` | κ |
| `lambda` | `\lambda` | λ |
| `Lambda` | `\Lambda` | Λ |
| `mu` | `\mu` | μ |
| `nu` | `\nu` | ν |
| `xi` | `\xi` | ξ |
| `Xi` | `\Xi` | Ξ |
| `pi` | `\pi` | π |
| `Pi` | `\Pi` | Π |
| `rho` | `\rho` | ρ |
| `sigma` | `\sigma` | σ |
| `Sigma` | `\Sigma` | Σ |
| `tau` | `\tau` | τ |
| `upsilon` | `\upsilon` | υ |
| `phi` | `\varphi` | φ |
| `Phi` | `\Phi` | Φ |
| `chi` | `\chi` | χ |
| `psi` | `\psi` | ψ |
| `Psi` | `\Psi` | Ψ |
| `omega` | `\omega` | ω |
| `Omega` | `\Omega` | Ω |

### Short Aliases (Tab-expand — type + Tab)

| Trigger + Tab | Result | Rendered |
|---------------|--------|----------|
| `alp` | `\alpha` | α |
| `bet` | `\beta` | β |
| `gam` | `\gamma` | γ |
| `del` | `\delta` | δ |
| `eps` | `\varepsilon` | ε |
| `lam` | `\lambda` | λ |
| `sig` | `\sigma` | σ |
| `ome` | `\omega` | ω |

### Greek Letters Without Snippets (Type the LaTeX directly)

| LaTeX | Rendered | Notes |
|-------|----------|-------|
| `\epsilon` | ϵ | Lunate epsilon (vs `\varepsilon` ε) |
| `\vartheta` | ϑ | Script theta variant |
| `\varrho` | ϱ | Script rho variant |
| `\varsigma` | ς | Final sigma |
| `\varphi` | φ | Already mapped to `phi` |
| `\digamma` | ϝ | Archaic Greek |

---

## 8. Operators & Relations

### Comparison (Auto-expand)

| Trigger | Result | Rendered | Description |
|---------|--------|----------|-------------|
| `!=` | `\neq` | ≠ | Not equal |
| `<=` | `\le` | ≤ | Less than or equal |
| `>=` | `\ge` | ≥ | Greater than or equal |
| `~~` | `\sim` | ∼ | Similar / distributed as |
| `~=` | `\cong` | ≅ | Congruent / isomorphic |
| `**` | `\cdot` | · | Dot product / multiplication |
| `xx` | `\times` | × | Cross product |
| `+-` | `\pm` | ± | Plus-minus |
| `-+` | `\mp` | ∓ | Minus-plus |

### Named Relations (Tab-expand)

| Trigger + Tab | Result | Rendered | Description |
|---------------|--------|----------|-------------|
| `equiv` | `\equiv` | ≡ | Identical / equivalent |
| `approx` | `\approx` | ≈ | Approximately |
| `prop` | `\propto` | ∝ | Proportional to |
| `perp` | `\perp` | ⊥ | Perpendicular |

### Named Operators (Tab-expand)

| Trigger + Tab | Result | Description |
|---------------|--------|-------------|
| `det` | `\det` | Determinant |
| `dim` | `\dim` | Dimension |
| `ker` | `\ker` | Kernel |
| `img` | `\operatorname{Im}` | Image |
| `hom` | `\operatorname{Hom}` | Hom functor |
| `sup` | `\sup` | Supremum |
| `inf` | `\inf` | Infimum |
| `max` | `\max` | Maximum |
| `min` | `\min` | Minimum |

### Binary Operations (Tab-expand)

| Trigger + Tab | Result | Rendered | Description |
|---------------|--------|----------|-------------|
| `otimes` | `\otimes` | ⊗ | Tensor product |
| `oplus` | `\oplus` | ⊕ | Direct sum |
| `wedge` | `\wedge` | ∧ | Wedge product |
| `vee` | `\vee` | ∨ | Vee / join |

### Special Symbols (Auto-expand)

| Trigger | Result | Rendered | Description |
|---------|--------|----------|-------------|
| `OO` | `\infty` | ∞ | Infinity |
| `ooo` | `\infty` | ∞ | Infinity (alternative) |
| `lll` | `\ell` | ℓ | Ell |
| `...` | `\ldots` | … | Horizontal dots |

### Special Symbols (Tab-expand)

| Trigger + Tab | Result | Rendered | Description |
|---------------|--------|----------|-------------|
| `cdot` | `\cdots` | ⋯ | Centered dots |
| `dag` | `\dagger` | † | Dagger |

### Additional Relations (Type LaTeX directly)

| LaTeX | Rendered | Common Use |
|-------|----------|------------|
| `\ll` | ≪ | Much less than |
| `\gg` | ≫ | Much greater than |
| `\prec` | ≺ | Precedes |
| `\succ` | ≻ | Succeeds |
| `\preceq` | ⪯ | Precedes or equal |
| `\succeq` | ⪰ | Succeeds or equal |
| `\simeq` | ≃ | Homotopy equivalence |
| `\doteq` | ≐ | Approaches the limit |
| `\parallel` | ∥ | Parallel |
| `\mid` | ∣ | Divides |
| `\nmid` | ∤ | Does not divide |
| `\vdash` | ⊢ | Proves / turnstile |
| `\dashv` | ⊣ | Reverse turnstile |
| `\models` | ⊨ | Models / satisfies |
| `\triangleleft` | ◁ | Normal subgroup |
| `\trianglerighteq` | ⊵ | Normal subgroup or equal |
| `\bowtie` | ⋈ | Natural join |
| `\asymp` | ≍ | Asymptotically equal |

---

## 9. Arrows

### Auto-expand Arrows

| Trigger | Result | Rendered | Description |
|---------|--------|----------|-------------|
| `->` | `\to` | → | Right arrow / maps to |
| `<-` | `\leftarrow` | ← | Left arrow |
| `<->` | `\leftrightarrow` | ↔ | Bidirectional |
| `=>` | `\implies` | ⟹ | Implies |
| `=<` | `\impliedby` | ⟸ | Implied by |
| `iff` | `\iff` | ⟺ | If and only if |
| `!>` | `\mapsto` | ↦ | Maps to |
| `>->` | `\hookrightarrow` | ↪ | Injection |
| `->>` | `\twoheadrightarrow` | ↠ | Surjection |
| `~>` | `\rightsquigarrow` | ⇝ | Squiggly arrow |

### Tab-expand Arrows

| Trigger + Tab | Result | Description |
|---------------|--------|-------------|
| `uarr` | `\uparrow` | Up arrow |
| `darr` | `\downarrow` | Down arrow |

### Additional Arrows (Type LaTeX directly)

| LaTeX | Rendered | Common Use |
|-------|----------|------------|
| `\Rightarrow` | ⇒ | Implies (short) |
| `\Leftarrow` | ⇐ | Implied by (short) |
| `\Leftrightarrow` | ⇔ | Iff (short) |
| `\longrightarrow` | ⟶ | Long right arrow |
| `\longleftarrow` | ⟵ | Long left arrow |
| `\xrightarrow{f}` | →^f | Arrow with label above |
| `\xleftarrow{f}` | ←^f | Arrow with label above |
| `\nearrow` | ↗ | Northeast arrow |
| `\searrow` | ↘ | Southeast arrow |
| `\nwarrow` | ↖ | Northwest arrow |
| `\swarrow` | ↙ | Southwest arrow |
| `\circlearrowleft` | ↺ | Counterclockwise |
| `\curvearrowright` | ↷ | Curve right |

---

## 10. Set Theory & Logic

### Set Symbols (Auto-expand)

| Trigger | Result | Rendered | Description |
|---------|--------|----------|-------------|
| `cc` | `\subset` | ⊂ | Proper subset |
| `ccc` | `\subseteq` | ⊆ | Subset or equal |
| `inn` | `\in` | ∈ | Element of |
| `notin` | `\notin` | ∉ | Not element of |
| `Nn` | `\cap` | ∩ | Intersection |
| `UU` | `\cup` | ∪ | Union |
| `eset` | `\emptyset` | ∅ | Empty set |
| `EE` | `\exists` | ∃ | Exists |
| `AA` | `\forall` | ∀ | For all |
| `NN` | `\mathbb{N}` | ℕ | Natural numbers |
| `ZZ` | `\mathbb{Z}` | ℤ | Integers |
| `QQ` | `\mathbb{Q}` | ℚ | Rationals |
| `RR` | `\mathbb{R}` | ℝ | Reals |
| `CC` | `\mathbb{C}` | ℂ | Complex numbers |
| `FF` | `\mathbb{F}` | 𝔽 | Field |
| `HH` | `\mathbb{H}` | ℍ | Quaternions / Hilbert |

### Set Operations (Tab-expand)

| Trigger + Tab | Result | Description |
|---------------|--------|-------------|
| `set` | `\{...\}` | Set braces |
| `neg` | `\neg` | Negation (¬) |
| `land` | `\land` | Logical AND (∧) |
| `lor` | `\lor` | Logical OR (∨) |

### Additional Set/Logic Symbols (Type LaTeX directly)

| LaTeX | Rendered | Common Use |
|-------|----------|------------|
| `\supset` | ⊃ | Proper superset |
| `\supseteq` | ⊇ | Superset or equal |
| `\subsetneq` | ⊊ | Strict subset |
| `\supsetneq` | ⊋ | Strict superset |
| `\setminus` | ∖ | Set difference |
| `\bigcup` | ⋃ | Big union |
| `\bigcap` | ⋂ | Big intersection |
| `\bigsqcup` | ⨆ | Disjoint union |
| `\varnothing` | ∅ | Empty set (variant) |
| `\complement` | ∁ | Complement |
| `\exists!` | ∃! | Unique existence |
| `\nexists` | ∄ | Does not exist |
| `\therefore` | ∴ | Therefore |
| `\because` | ∵ | Because |
| `\mathcal{P}(X)` | 𝒫(X) | Power set |
| `X \times Y` | X × Y | Cartesian product |

---

## 11. Calculus & Analysis

### Calculus Operators (Tab-expand — type trigger + Tab)

| Trigger + Tab | Result | Description |
|---------------|--------|-------------|
| `lim` | `\lim_{▯ \to ▯}` | Limit |
| `sum` | `\sum_{▯}^{▯}` | Summation |
| `prod` | `\prod_{▯}^{▯}` | Product |
| `int` | `\int_{▯}^{▯} ▯ \, d▯` | Integral |
| `oint` | `\oint_{▯}` | Contour integral |
| `dint` | `\int_{-\infty}^{\infty}` | Integral -∞ to ∞ |
| `part` | `\frac{\partial ▯}{\partial ▯}` | Partial derivative |
| `grad` | `\nabla` | Gradient |
| `div` | `\nabla \cdot` | Divergence |
| `curl` | `\nabla \times` | Curl |

### Auto-expand

| Trigger | Result | Description |
|---------|--------|-------------|
| `nabla` | `\nabla` | Nabla (∇) |

### Common Analysis Patterns (Type LaTeX directly)

| What you want | LaTeX | Notes |
|--------------|-------|-------|
| lim sup | `\limsup_{n \to \infty}` | Limit superior |
| lim inf | `\liminf_{n \to \infty}` | Limit inferior |
| dx | `\, dx` | Differential (with thin space) |
| d/dx | `\frac{d}{dx}` | Ordinary derivative |
| d²/dx² | `\frac{d^2}{dx^2}` | Second derivative |
| ∂f/∂x | `\frac{\partial f}{\partial x}` | Or use `part` + Tab |
| ∂²f/∂x∂y | `\frac{\partial^2 f}{\partial x \partial y}` | Mixed partial |
| ∫∫ | `\iint` | Double integral |
| ∫∫∫ | `\iiint` | Triple integral |
| f'(x) | `f'(x)` | First derivative |
| f''(x) | `f''(x)` | Second derivative |
| ẋ | `\dot{x}` | Time derivative (or use `xdot` snippet) |
| ẍ | `\ddot{x}` | Second time derivative |

### Real Analysis Essentials

| Concept | LaTeX | Usage |
|---------|-------|-------|
| Open interval | `(a, b)` | Just type normally |
| Closed interval | `[a, b]` | Just type normally |
| Half-open | `[a, b)` or `(a, b]` | Just type normally |
| Epsilon-delta | `\forall \varepsilon > 0, \exists \delta > 0` | Use `AA` + `epsilon` + `EE` + `delta` |
| Sequence | `\{a_n\}_{n=1}^{\infty}` | Use `set` Tab + `a_n` |
| Converges | `\to` or `\rightarrow` | Use `->` |
| Norm | `\|x\|` or `\left\| x \right\|` | Use `norm` + Tab |
| Measure zero | `\mu(E) = 0` | `mu` auto-expands |
| a.e. | `\text{a.e.}` | Use `tt` + Tab |
| σ-algebra | `\sigma\text{-algebra}` | `sigma` auto-expands |
| Borel | `\mathcal{B}` | Use `cal` + Tab + `B` |
| L^p space | `L^p` or `\mathcal{L}^p` | Type directly or `cal` Tab |

---

## 12. Linear Algebra & Matrices

### Matrix Environments (Tab-expand — type + Tab in display math)

| Trigger + Tab | Result | Description |
|---------------|--------|-------------|
| `pmat` | `\begin{pmatrix}...\end{pmatrix}` | Parenthesized matrix ( ) |
| `bmat` | `\begin{bmatrix}...\end{bmatrix}` | Bracketed matrix [ ] |
| `vmat` | `\begin{vmatrix}...\end{vmatrix}` | Determinant matrix \| \| |
| `mat` | `\begin{matrix}...\end{matrix}` | Plain matrix (no delimiters) |
| `arr` | `\begin{array}{▯}...\end{array}` | Array (custom columns) |

### Matrix Syntax

Inside a matrix environment, separate entries with `&` and rows with `\\`:

```latex
\begin{pmatrix}
a & b \\
c & d
\end{pmatrix}
```

### Common Linear Algebra Notation (Type LaTeX directly)

| What you want | LaTeX | Notes |
|--------------|-------|-------|
| Transpose | `A^T` or `A^\top` | |
| Inverse | `A^{-1}` | Or use `invs` snippet |
| Determinant | `\det(A)` | `det` Tab |
| Trace | `\operatorname{tr}(A)` | |
| Rank | `\operatorname{rank}(A)` | |
| Null space | `\ker(A)` or `\operatorname{null}(A)` | `ker` Tab |
| Column space | `\operatorname{Col}(A)` | |
| Row space | `\operatorname{Row}(A)` | |
| Span | `\operatorname{span}\{v_1, \ldots, v_n\}` | |
| Inner product | `\langle u, v \rangle` | Use `lr<` Tab |
| Norm | `\|v\|` | Use `norm` Tab |
| Direct sum | `V \oplus W` | `oplus` Tab |
| Tensor product | `V \otimes W` | `otimes` Tab |
| Identity matrix | `I_n` | |
| Zero matrix | `\mathbf{0}` | `bf` Tab + `0` |
| Eigenvalue | `\lambda` | `lambda` auto |
| Conjugate transpose | `A^*` | |

---

## 13. Number Fields & Algebraic Structures

### Number Fields (Auto-expand — type the trigger)

| Trigger | Result | Rendered | Description |
|---------|--------|----------|-------------|
| `NN` | `\mathbb{N}` | ℕ | Natural numbers |
| `ZZ` | `\mathbb{Z}` | ℤ | Integers |
| `QQ` | `\mathbb{Q}` | ℚ | Rationals |
| `RR` | `\mathbb{R}` | ℝ | Reals |
| `CC` | `\mathbb{C}` | ℂ | Complex numbers |
| `FF` | `\mathbb{F}` | 𝔽 | Finite field |
| `HH` | `\mathbb{H}` | ℍ | Quaternions / Hilbert space |

### Algebraic Structures (Type LaTeX directly)

| What you want | LaTeX | Notes |
|--------------|-------|-------|
| Group (G, ·) | `(G, \cdot)` | |
| Ring R | `R` (or `\mathcal{R}` for script) | |
| Ideal I | `\mathfrak{I}` or `I` | `frak` Tab + `I` |
| Prime ideal | `\mathfrak{p}` | `frak` Tab + `p` |
| Maximal ideal | `\mathfrak{m}` | `frak` Tab + `m` |
| Quotient | `G / H` or `R / I` | |
| Normal subgroup | `H \triangleleft G` | |
| Isomorphic | `\cong` | Use `~=` |
| Homomorphism | `\varphi: G \to H` | `phi` + `: G` + `->` + ` H` |
| Automorphism group | `\operatorname{Aut}(G)` | |
| Center | `Z(G)` | |
| Centralizer | `C_G(x)` | |
| Normalizer | `N_G(H)` | |
| Galois group | `\operatorname{Gal}(E/F)` | |
| Field extension | `[E : F]` | |
| Polynomial ring | `\mathbb{F}[x]` | `FF` + `[x]` |
| Z mod n | `\mathbb{Z}/n\mathbb{Z}` | `ZZ` + `/n` + `ZZ` |
| GL(n) | `\operatorname{GL}_n(\mathbb{R})` | |
| SL(n) | `\operatorname{SL}_n(\mathbb{R})` | |

---

## 14. Decorations & Accents

### Postfix Decorations (Auto-expand — type letter + decoration)

| Trigger | Result | Rendered | Description |
|---------|--------|----------|-------------|
| `xbar` | `\overline{x}` | x̄ | Overline / conjugate |
| `xhat` | `\hat{x}` | x̂ | Hat / estimator |
| `xtil` | `\tilde{x}` | x̃ | Tilde |
| `xdot` | `\dot{x}` | ẋ | Dot (time derivative) |
| `xddot` | `\ddot{x}` | ẍ | Double dot |
| `xvec` | `\vec{x}` | x⃗ | Vector arrow |

> **Note**: Replace `x` with any letter: `Abar` → `\overline{A}`, `fhat` → `\hat{f}`, etc.

### Prefix Decorations (Tab-expand — type trigger + Tab, then type the letter)

| Trigger + Tab | Result | Description |
|---------------|--------|-------------|
| `bar` | `\overline{▯}` | Overline |
| `hat` | `\hat{▯}` | Hat |
| `til` | `\tilde{▯}` | Tilde |
| `wbar` | `\overline{▯}` | Wide overline |
| `what` | `\widehat{▯}` | Wide hat |
| `wtil` | `\widetilde{▯}` | Wide tilde |
| `und` | `\underline{▯}` | Underline |
| `conj` | `\overline{▯}` | Complex conjugate |

### Additional Accents (Type LaTeX directly)

| LaTeX | Rendered | Common Use |
|-------|----------|------------|
| `\bar{x}` | x̄ | Mean / conjugate (narrow) |
| `\overline{AB}` | A̅B̅ | Line segment |
| `\underline{x}` | x̲ | Underline |
| `\overbrace{x+y}^{n}` | ⏞ | Group with label above |
| `\underbrace{x+y}_{n}` | ⏟ | Group with label below |
| `\overset{!}{=}` | =^! | Symbol above relation |
| `\underset{\sim}{A}` | A̰ | Symbol below |
| `\check{x}` | x̌ | Check (háček) |
| `\breve{x}` | x̆ | Breve |
| `\acute{x}` | x́ | Acute accent |
| `\grave{x}` | x̀ | Grave accent |
| `\mathring{x}` | x̊ | Ring accent |

---

## 15. Fractions, Roots & Powers

### Fractions (Auto-expand)

| Trigger | Result | Description |
|---------|--------|-------------|
| `//` | `\frac{▯}{▯}` | General fraction |
| `3/` | `\frac{3}{▯}` | Numeric fraction (any digits) |
| `\pi/` | `\frac{\pi}{▯}` | Expression fraction |
| `4\pi^2/` | `\frac{4\pi^2}{▯}` | Complex expression fraction |

### Powers & Subscripts (Auto-expand)

| Trigger | Result | Description |
|---------|--------|-------------|
| `sr` | `^2` | Squared |
| `cb` | `^3` | Cubed |
| `td` | `^{▯}` | General superscript (cursor in braces) |
| `__` | `_{▯}` | General subscript (cursor in braces) |
| `compl` | `^{c}` | Complement |
| `invs` | `^{-1}` | Inverse |
| `A1` | `A_1` | Auto-subscript (letter + digit) |
| `a12` | `a_{12}` | Auto-subscript (multi-digit) |

### Roots (Tab-expand)

| Trigger + Tab | Result | Description |
|---------------|--------|-------------|
| `sq` | `\sqrt{▯}` | Square root |

### Additional (Type LaTeX directly)

| LaTeX | Description |
|-------|-------------|
| `\sqrt[n]{x}` | n-th root |
| `x^{n+1}` | Complex exponent |
| `a_{i,j}` | Double subscript |
| `x_i^2` | Sub and superscript |
| `\binom{n}{k}` | Binomial coefficient |
| `{n \choose k}` | Binomial (alternate) |

---

## 16. Brackets & Delimiters

### Auto-sizing Brackets (Tab-expand)

| Trigger + Tab | Result | Description |
|---------------|--------|-------------|
| `lr(` | `\left( ▯ \right)` | Auto-sized parentheses |
| `lr[` | `\left[ ▯ \right]` | Auto-sized brackets |
| `lr{` | `\left\{ ▯ \right\}` | Auto-sized braces |
| `lr\|` | `\left\| ▯ \right\|` | Auto-sized absolute value |
| `lr<` | `\left\langle ▯ \right\rangle` | Auto-sized angle brackets |
| `ceil` | `\lceil ▯ \rceil` | Ceiling |
| `floor` | `\lfloor ▯ \rfloor` | Floor |
| `norm` | `\left\| ▯ \right\|` | Norm |

### Manual Brackets (Type LaTeX directly)

| LaTeX | Description |
|-------|-------------|
| `\left( ... \right)` | Auto-sized ( ) |
| `\big( ... \big)` | Big ( ) |
| `\Big( ... \Big)` | Bigger ( ) |
| `\bigg( ... \bigg)` | Even bigger |
| `\Bigg( ... \Bigg)` | Biggest |
| `\langle ... \rangle` | Angle brackets ⟨ ⟩ |
| `\lceil ... \rceil` | Ceiling ⌈ ⌉ |
| `\lfloor ... \rfloor` | Floor ⌊ ⌋ |
| `\left. ... \right\|` | One-sided delimiter |

---

## 17. Functions

### Trigonometric (Auto-expand)

| Trigger | Result |
|---------|--------|
| `sin` | `\sin` |
| `cos` | `\cos` |
| `tan` | `\tan` |
| `cot` | `\cot` |
| `sec` | `\sec` |
| `csc` | `\csc` |
| `asin` | `\arcsin` |
| `acos` | `\arccos` |
| `atan` | `\arctan` |

### Logarithmic / Exponential (Auto-expand)

| Trigger | Result |
|---------|--------|
| `ln` | `\ln` |
| `log` | `\log` |
| `exp` | `\exp` |

### Hyperbolic (Auto-expand)

| Trigger | Result |
|---------|--------|
| `sinh` | `\sinh` |
| `cosh` | `\cosh` |
| `tanh` | `\tanh` |

### Other Functions (Tab-expand)

| Trigger + Tab | Result | Description |
|---------------|--------|-------------|
| `gcd` | `\gcd` | Greatest common divisor |
| `lcm` | `\operatorname{lcm}` | Least common multiple |
| `deg` | `\deg` | Degree |
| `arg` | `\arg` | Argument |

---

## 18. Environments

### Math Environments (Tab-expand — use inside display math)

| Trigger + Tab | Environment | Usage |
|---------------|------------|-------|
| `ali` | `aligned` | Multi-line aligned equations |
| `case` | `cases` | Piecewise functions |
| `pmat` | `pmatrix` | Matrix with ( ) |
| `bmat` | `bmatrix` | Matrix with [ ] |
| `vmat` | `vmatrix` | Determinant \| \| |
| `mat` | `matrix` | Plain matrix |
| `arr` | `array` | Custom column format |
| `beg` | `\begin{▯}...\end{▯}` | Generic environment |

### Environment Syntax Examples

**Aligned equations:**
```latex
\begin{aligned}
  f(x) &= x^2 + 2x + 1 \\
       &= (x + 1)^2
\end{aligned}
```

**Piecewise function:**
```latex
f(x) = \begin{cases}
  1 & \text{if } x > 0 \\
  0 & \text{if } x = 0 \\
  -1 & \text{if } x < 0
\end{cases}
```

**Matrix:**
```latex
\begin{pmatrix}
  a & b \\
  c & d
\end{pmatrix}
```

---

## 19. Theorem Environments

### Keyboard Shortcuts (Text mode)

| Shortcut | Environment | Style |
|----------|------------|-------|
| Ctrl+Shift+T | Theorem | Blue, italic body |
| Ctrl+Shift+D | Definition | Green |
| Ctrl+Shift+P | Proof | Gray |

### Toolbar: + Environment Dropdown

| Environment | Color | Body Style |
|-------------|-------|------------|
| Theorem | Blue | Italic |
| Lemma | Blue | Italic |
| Proposition | Blue | Italic |
| Corollary | Blue | Italic |
| Definition | Green | Normal |
| Proof | Gray | Italic header |
| Remark | Yellow | Normal |
| Example | Pink | Normal |

---

## 20. Math Formatting

### Font Commands (Tab-expand — type trigger + Tab, then type content)

| Trigger + Tab | Result | Rendered | Usage |
|---------------|--------|----------|-------|
| `bf` | `\mathbf{▯}` | **x** | Bold (vectors, matrices) |
| `cal` | `\mathcal{▯}` | 𝒳 | Calligraphic (categories, sheaves) |
| `frak` | `\mathfrak{▯}` | 𝔛 | Fraktur (ideals, Lie algebras) |
| `scr` | `\mathscr{▯}` | 𝒳 | Script (collections, sheaves) |
| `tt` | `\text{▯}` | text | Text inside math |

### Additional Font Commands (Type LaTeX directly)

| LaTeX | Description | Example Use |
|-------|-------------|-------------|
| `\mathbb{X}` | Blackboard bold | ℝ, ℤ, ℂ (or use `RR`, `ZZ`, `CC` snippets) |
| `\mathrm{X}` | Roman (upright) | Units, labels |
| `\mathit{X}` | Italic | Default math italic |
| `\mathsf{X}` | Sans-serif | Categories in some conventions |
| `\boldsymbol{x}` | Bold symbol | Bold Greek letters |

### Spacing in Math

| LaTeX | Space width | Usage |
|-------|------------|-------|
| `\,` | Thin space | Before dx: `f(x) \, dx` |
| `\:` | Medium space | |
| `\;` | Thick space | |
| `\quad` | 1 em | Between expressions |
| `\qquad` | 2 em | Wide separation |
| `\!` | Negative thin space | Tighten spacing |

---

## 21. Additional LaTeX Symbols

These symbols don't have snippets — type the LaTeX command directly inside math mode.

### Topology & Geometry

| LaTeX | Rendered | Description |
|-------|----------|-------------|
| `\partial` | ∂ | Boundary, partial derivative |
| `\circ` | ∘ | Composition |
| `\bullet` | • | Bullet |
| `\star` | ★ | Star |
| `\diamond` | ◇ | Diamond |
| `\triangle` | △ | Triangle |
| `\square` | □ | QED symbol / square |
| `\angle` | ∠ | Angle |
| `\sphericalangle` | ∢ | Spherical angle |

### Category Theory

| LaTeX | Description |
|-------|-------------|
| `\operatorname{Hom}(A, B)` | Hom set (or `hom` Tab) |
| `\operatorname{Mor}(\mathcal{C})` | Morphisms |
| `\operatorname{Ob}(\mathcal{C})` | Objects |
| `\operatorname{End}(V)` | Endomorphisms |
| `\operatorname{Aut}(G)` | Automorphisms |
| `\stackrel{f}{\longrightarrow}` | Labeled arrow |
| `\hookrightarrow` | Injection (or `>->`) |
| `\twoheadrightarrow` | Surjection (or `->>`) |
| `\cong` | Isomorphism (or `~=`) |

### Probability & Statistics

| LaTeX | Description |
|-------|-------------|
| `\mathbb{P}(A)` | Probability |
| `\mathbb{E}[X]` | Expected value |
| `\operatorname{Var}(X)` | Variance |
| `\operatorname{Cov}(X, Y)` | Covariance |
| `X \sim \mathcal{N}(\mu, \sigma^2)` | Normal distribution |
| `\binom{n}{k}` | Binomial coefficient |
| `\bar{X}` | Sample mean |
| `\hat{\theta}` | Estimator |
| `\overset{d}{\to}` | Converges in distribution |
| `\overset{p}{\to}` | Converges in probability |
| `\overset{a.s.}{\to}` | Almost sure convergence |
| `\perp \!\!\! \perp` | Independence |

### Complex Analysis

| LaTeX | Description |
|-------|-------------|
| `\operatorname{Re}(z)` | Real part |
| `\operatorname{Im}(z)` | Imaginary part |
| `\bar{z}` | Complex conjugate (or `zbar`) |
| `|z|` | Modulus |
| `\arg(z)` | Argument (`arg` Tab) |
| `\oint_C f(z) \, dz` | Contour integral (`oint` Tab) |
| `\operatorname{Res}_{z=a} f(z)` | Residue |
| `\infty` | Point at infinity (`OO`) |

### Differential Geometry / Topology

| LaTeX | Description |
|-------|-------------|
| `T_p M` | Tangent space |
| `T^* M` | Cotangent bundle |
| `\Gamma(E)` | Sections of bundle |
| `\Omega^k(M)` | k-forms |
| `\wedge` | Wedge product (`wedge` Tab) |
| `d\omega` | Exterior derivative |
| `\nabla_X Y` | Covariant derivative |
| `\pi_1(X)` | Fundamental group |
| `H_n(X)` | Homology |
| `H^n(X)` | Cohomology |
| `\chi(M)` | Euler characteristic |
| `\cong` | Homeomorphic (`~=`) |
| `\simeq` | Homotopy equivalent |

### Number Theory

| LaTeX | Description |
|-------|-------------|
| `a \mid b` | a divides b |
| `a \nmid b` | a does not divide b |
| `a \equiv b \pmod{n}` | Congruence mod n |
| `\gcd(a, b)` | GCD (`gcd` Tab) |
| `\operatorname{lcm}(a, b)` | LCM (`lcm` Tab) |
| `\left(\frac{a}{p}\right)` | Legendre symbol |
| `\zeta(s)` | Riemann zeta |
| `\phi(n)` or `\varphi(n)` | Euler's totient (`phi`) |
| `\mu(n)` | Möbius function (`mu` auto) |
| `\Lambda(n)` | von Mangoldt function |
| `\pi(x)` | Prime counting function (`pi` auto) |
| `\mathcal{O}(f)` | Big-O notation (`cal` Tab) |

### Miscellaneous Symbols

| LaTeX | Rendered | Description |
|-------|----------|-------------|
| `\hbar` | ℏ | Reduced Planck constant |
| `\aleph` | ℵ | Aleph (cardinal) |
| `\beth` | ℶ | Beth (cardinal) |
| `\wp` | ℘ | Weierstrass p |
| `\Re` | ℜ | Real part (script) |
| `\Im` | ℑ | Imaginary part (script) |
| `\imath` | ı | Dotless i |
| `\jmath` | ȷ | Dotless j |
| `\infty` | ∞ | Infinity (`OO` or `ooo`) |
| `\partial` | ∂ | Partial derivative |
| `\nabla` | ∇ | Nabla / Del (`nabla` auto) |
| `\surd` | √ | Surd / root sign |
| `\top` | ⊤ | Top / true |
| `\bot` | ⊥ | Bottom / false |
| `\sharp` | ♯ | Sharp |
| `\flat` | ♭ | Flat |
| `\natural` | ♮ | Natural |

---

## 22. AI Assistant

### Usage
1. Press **Ctrl+K** or click **AI** in toolbar
2. Type your request in natural language
3. Press **Enter** to send
4. Preview the generated LaTeX
5. Press **Enter** to insert, **Escape** to cancel

### Setup
Click **Settings** → choose provider (OpenAI / Anthropic / Gemini) → enter your API key → click **Test Connection**

### Example Prompts

| You type | AI returns |
|----------|-----------|
| "integral of e^x sin x dx" | `\int e^x \sin x \, dx` |
| "definition of compact set" | A formal LaTeX definition |
| "Stokes theorem" | `\int_M d\omega = \oint_{\partial M} \omega` |
| "3x3 identity matrix" | `\begin{pmatrix} 1 & 0 & 0 \\ ... \end{pmatrix}` |

---

## 23. LaTeX Export

Click **Export .tex** in the toolbar. The exported file includes:

- Full preamble: `amsmath`, `amssymb`, `amsthm`, `mathrsfs`
- `\newtheorem` definitions for all 8 environments
- Headings → `\section`, `\subsection`, etc.
- Inline math → `$...$`
- Display math → `\[...\]`
- Theorem blocks → `\begin{theorem}...\end{theorem}`
- Lists → `\begin{itemize}` / `\begin{enumerate}`
- Formatting → `\textbf`, `\textit`, `\underline`

Compile with `pdflatex` or upload to Overleaf.

---

## 24. Keyboard Shortcuts

### Global

| Shortcut | Action |
|----------|--------|
| Ctrl+B | Bold |
| Ctrl+I | Italic |
| Ctrl+U | Underline |
| Ctrl+K | Open AI assistant |
| Ctrl+Shift+T | Insert Theorem |
| Ctrl+Shift+D | Insert Definition |
| Ctrl+Shift+P | Insert Proof |

### In Inline Math (Yellow Box)

| Key | Action |
|-----|--------|
| Enter | Save and exit math mode |
| Escape | Save and exit math mode |
| Backspace (empty) | Delete the math node |
| Tab | Expand tab-snippet |

### In Display Math (Textarea)

| Key | Action |
|-----|--------|
| Ctrl+Enter | Save and exit math mode |
| Escape | Save and exit math mode |
| Tab | Expand tab-snippet |

---

## 25. Tips for Lecture-Speed Notes

### 1. Master the Top 10 Snippets

These cover 80% of math typing:

| Snippet | What it does | How often you'll use it |
|---------|-------------|----------------------|
| `mk` | Enter inline math | Every equation |
| `dm` | Enter display math | Every display equation |
| `//` | Fraction | Very frequently |
| `sr` | Squared | Frequently |
| `td` | General exponent | Frequently |
| `inn` | Element of (∈) | Very frequently in analysis/algebra |
| `->` | Right arrow | Frequently |
| `phi` | φ (varphi) | Common in analysis |
| `OO` | Infinity | Frequent in limits |
| `AA` / `EE` | For all / Exists | Frequent in proofs |

### 2. Use Auto-Subscript

Never type `_` for simple subscripts:
- `x1` → `x_1`
- `a12` → `a_{12}`
- `An` → `A_n`

### 3. Chain Snippets

Combine snippets in sequence:
- `\bigcup_{n=1}td OO` → `\bigcup_{n=1}^{\infty}` (td + OO = two auto-expands)
- `phi(A UU B)` → `\varphi(A \cup B)` (phi + UU = two auto-expands)

### 4. Use AI for Complex Expressions

Press Ctrl+K and describe what you want:
- "commutative diagram with f, g, h"
- "exact sequence 0 to A to B to C to 0"
- "Jordan canonical form 3x3"

### 5. Lecture Note Workflow

1. Before class: create a notebook and note for the lecture
2. During class: type headings for topics, use theorem environments
3. Use `dm` for important equations, `mk` for inline references
4. After class: review and use Export .tex for clean PDF
