# MathFlow User Guide

> MathFlow — Fast, WYSIWYG Math Notes with LaTeX Export

**Version**: 0.1.0
**Last Updated**: 2026-03-01

---

## Table of Contents

1. [Getting Started](#1-getting-started)
   - 1.1 [System Requirements](#11-system-requirements)
   - 1.2 [Installation & Setup](#12-installation--setup)
   - 1.3 [Interface Overview](#13-interface-overview)
   - 1.4 [Your First Note](#14-your-first-note)
2. [Notebooks & Notes Management](#2-notebooks--notes-management)
   - 2.1 [Creating Notebooks](#21-creating-notebooks)
   - 2.2 [Creating Notes](#22-creating-notes)
   - 2.3 [Renaming & Deleting](#23-renaming--deleting)
   - 2.4 [Auto-Save](#24-auto-save)
3. [Text Editing Basics](#3-text-editing-basics)
   - 3.1 [Headings](#31-headings)
   - 3.2 [Text Formatting](#32-text-formatting)
   - 3.3 [Lists](#33-lists)
   - 3.4 [Block Quotes & Code](#34-block-quotes--code)
4. [Math Input — The Core Feature](#4-math-input--the-core-feature)
   - 4.1 [Entering Math Mode](#41-entering-math-mode)
   - 4.2 [Inline vs. Display Math](#42-inline-vs-display-math)
   - 4.3 [Editing Math Nodes](#43-editing-math-nodes)
   - 4.4 [Direct LaTeX Input](#44-direct-latex-input)
5. [Snippet System — Speed Up Your Typing](#5-snippet-system--speed-up-your-typing)
   - 5.1 [How Snippets Work](#51-how-snippets-work)
   - 5.2 [Auto-Expand Snippets](#52-auto-expand-snippets)
   - 5.3 [Tab-Expand Snippets](#53-tab-expand-snippets)
   - 5.4 [Tab Stop Navigation](#54-tab-stop-navigation)
   - 5.5 [Complete Snippet Reference](#55-complete-snippet-reference)
6. [Theorem Environments](#6-theorem-environments)
   - 6.1 [Available Environments](#61-available-environments)
   - 6.2 [Inserting Environments](#62-inserting-environments)
   - 6.3 [Writing Inside Environments](#63-writing-inside-environments)
7. [AI Assistant](#7-ai-assistant)
   - 7.1 [Setting Up AI](#71-setting-up-ai)
   - 7.2 [Using the AI Panel](#72-using-the-ai-panel)
   - 7.3 [Effective Prompts](#73-effective-prompts)
   - 7.4 [Editing AI Output](#74-editing-ai-output)
   - 7.5 [Troubleshooting AI](#75-troubleshooting-ai)
8. [LaTeX Export](#8-latex-export)
   - 8.1 [Exporting to .tex](#81-exporting-to-tex)
   - 8.2 [Export Structure](#82-export-structure)
   - 8.3 [Compiling the Exported File](#83-compiling-the-exported-file)
9. [Keyboard Shortcuts Reference](#9-keyboard-shortcuts-reference)
10. [Complete Snippet Tables](#10-complete-snippet-tables)
    - 10.1 [Fractions & Superscripts](#101-fractions--superscripts)
    - 10.2 [Greek Letters](#102-greek-letters)
    - 10.3 [Arrows & Relations](#103-arrows--relations)
    - 10.4 [Sets & Logic](#104-sets--logic)
    - 10.5 [Operators & Calculus](#105-operators--calculus)
    - 10.6 [Decorations](#106-decorations)
    - 10.7 [Environments & Matrices](#107-environments--matrices)
    - 10.8 [Functions](#108-functions)
    - 10.9 [Brackets](#109-brackets)
    - 10.10 [Formatting](#1010-formatting)
    - 10.11 [Miscellaneous Symbols](#1011-miscellaneous-symbols)
11. [FAQ & Troubleshooting](#11-faq--troubleshooting)
12. [Tips for Lecture Note-Taking](#12-tips-for-lecture-note-taking)

---

## 1. Getting Started

### 1.1 System Requirements

- **Browser**: Chrome, Firefox, Edge, or Safari (latest versions)
- **Internet**: Required for AI features; editing works offline
- **Screen**: Recommended 13" or larger for comfortable three-panel layout

### 1.2 Installation & Setup

**For development / self-hosting:**

```bash
# Clone the repository
git clone https://github.com/TerazW/mathflow-ce.git
cd mathflow-ce/mathflow

# Install frontend dependencies
npm install

# Install backend dependencies
cd server && npm install && cd ..

# Start the frontend (http://localhost:5173)
npm run dev

# In a separate terminal, start the backend (http://localhost:3001)
cd server && npm run dev
```

### 1.3 Interface Overview

MathFlow uses an Overleaf-inspired three-panel layout:

```
┌──────────┬───────────────────────────────────┬─────────────┐
│          │         Main Header               │             │
│          │  [Snippets] [Settings]            │             │
│ Sidebar  ├───────────────────────────────────┤  Snippet    │
│          │         Toolbar                   │  Reference  │
│ Notebooks│  B I U | H1 H2 | ∑ ∫ | Env | AI │  Panel      │
│ & Notes  ├───────────────────────────────────┤ (toggle)    │
│          │                                   │             │
│          │         Editor Area               │  Search...  │
│          │                                   │  ─────────  │
│          │   Your notes appear here          │  Fractions  │
│          │   with WYSIWYG math rendering     │  // → \frac │
│          │                                   │  Greek      │
│          │                                   │  alpha → \α │
│          │                                   │  ...        │
│          │                                   │             │
├──────────┤                                   │             │
│Shortcuts │                                   │             │
│$ → math  │                                   │             │
│Ctrl+K→AI │                                   │             │
└──────────┴───────────────────────────────────┴─────────────┘
```

**Left Sidebar** (dark theme):
- Create and manage notebooks (course-level containers)
- Create and manage notes within notebooks
- Quick shortcut reference at the bottom

**Center Area**:
- Top: Toolbar with formatting controls
- Main: WYSIWYG editor area

**Right Panel** (toggle with "Snippets" button):
- Searchable reference of all available snippets

### 1.4 Your First Note

1. Click the **+** button next to "Notebooks" in the sidebar
2. Name your notebook (e.g., "Linear Algebra")
3. Click **+ New Note** inside the notebook
4. Start typing in the editor area
5. Type `$` to enter inline math mode — a math placeholder appears
6. Click it and type LaTeX (e.g., `x^2 + y^2 = r^2`)
7. Click outside or press **Enter** to see the rendered formula

---

## 2. Notebooks & Notes Management

### 2.1 Creating Notebooks

Notebooks are top-level containers, typically one per course or topic.

1. Click **+** next to "Notebooks" in the sidebar
2. A new notebook named "New Notebook" appears
3. The name is immediately editable — type your desired name and press **Enter**

### 2.2 Creating Notes

Notes live inside notebooks and contain your actual content.

1. Click a notebook to expand it
2. Click **+ New Note** at the bottom of the note list
3. The note name is editable — type a name and press **Enter**
4. Click the note to open it in the editor

### 2.3 Renaming & Deleting

- **Rename**: Double-click the notebook or note name in the sidebar
- **Delete notebook**: Click the **×** button (appears on hover) — this deletes all notes inside it
- **Delete note**: Click the **×** button on the note item

### 2.4 Auto-Save

MathFlow auto-saves your work:
- Changes are saved to browser localStorage every **2 seconds** after you stop typing
- Saved automatically when you switch notes or close the tab
- No manual save button needed

> **Important**: Data is stored in your browser's localStorage. Clearing browser data will delete your notes. Cloud sync is planned for a future release.

---

## 3. Text Editing Basics

### 3.1 Headings

Use the **heading dropdown** in the toolbar or type in Markdown style:

| Method | Result |
|--------|--------|
| Toolbar → "Heading 1" | Section heading (largest) |
| Toolbar → "Heading 2" | Subsection heading |
| Toolbar → "Heading 3" | Subsubsection heading |
| Toolbar → "Paragraph" | Normal text |

In LaTeX export, headings map to: `\section{}`, `\subsection{}`, `\subsubsection{}`, `\paragraph{}`.

### 3.2 Text Formatting

| Shortcut | Button | Effect |
|----------|--------|--------|
| `Ctrl+B` | **B** | **Bold** |
| `Ctrl+I` | *I* | *Italic* |
| `Ctrl+U` | U | Underline |

### 3.3 Lists

| Button | Result |
|--------|--------|
| "• List" | Bullet list |
| "1. List" | Numbered list |

Press **Enter** to add items, **Enter** on empty item to exit the list.

### 3.4 Block Quotes & Code

| Button | Result |
|--------|--------|
| " Quote | Block quote (indented, left-bordered) |

---

## 4. Math Input — The Core Feature

### 4.1 Entering Math Mode

There are two ways to enter math mode:

**Method 1: Type `$`**
- In text mode, type a dollar sign `$`
- An inline math node appears with a placeholder
- Click the placeholder to start typing LaTeX

**Method 2: Toolbar buttons**
- Click **∑ Inline** for inline math
- Click **∫ Display** for display (block) math

**Method 3: Snippets**
- Type `mk` in text mode → creates inline math (same as typing `$`)
- Type `dm` in text mode → creates display math (same as typing `$$`)

### 4.2 Inline vs. Display Math

| Type | Trigger | Appearance | Use For |
|------|---------|------------|---------|
| **Inline** | `$` or `mk` or ∑ button | Renders within text flow: "Let $x \in \mathbb{R}$" | Short expressions, single symbols, variables |
| **Display** | `$$` or `dm` or ∫ button | Centered on its own line, larger | Important equations, derivations, multi-line |

**Example — Inline math:**
> The Cauchy-Schwarz inequality states that $|\langle u, v \rangle| \leq \|u\| \cdot \|v\|$ for all vectors.

**Example — Display math:**
$$\int_0^\infty e^{-x^2} \, dx = \frac{\sqrt{\pi}}{2}$$

### 4.3 Editing Math Nodes

**Entering edit mode:**
- Click on any rendered math formula
- The formula switches to a LaTeX source editor

**Inline math editing:**
- A yellow-highlighted text field appears inline
- Type or modify the LaTeX
- The rendered preview updates in real-time behind the editor

**Display math editing:**
- A textarea appears with the LaTeX source
- Below it, a live KaTeX preview shows the rendered result
- The textarea auto-resizes as you type

**Exiting edit mode:**
- Press **Enter** (inline math) or **Ctrl+Enter** (display math)
- Press **Escape**
- Click outside the math node
- The formula re-renders with your changes

**Deleting a math node:**
- In edit mode, if the content is empty, press **Backspace** to delete the node
- Or select the node and press **Delete**

### 4.4 Direct LaTeX Input

Inside a math node, you type standard LaTeX:

```
\frac{1}{2}          → ½
x^{2}                → x²
\sqrt{a^2 + b^2}     → √(a²+b²)
\sum_{i=1}^{n} x_i   → Σ from i=1 to n of xᵢ
\begin{pmatrix} a & b \\ c & d \end{pmatrix}  → matrix
```

MathFlow uses **KaTeX** for rendering. All standard LaTeX math commands work. See the [KaTeX supported functions list](https://katex.org/docs/supported.html) for the complete reference.

---

## 5. Snippet System — Speed Up Your Typing

The snippet system is what makes MathFlow as fast as handwriting. Instead of typing `\frac{}{},` you type `//` and it expands instantly.

### 5.1 How Snippets Work

There are two types of snippets:

**Auto-expand** — triggers immediately as you type:
```
sr  →  ^2           (instant, no key needed)
//  →  \frac{}{}    (instant)
->  →  \to          (instant)
```

**Tab-expand** — type the trigger, then press **Tab**:
```
sum + Tab  →  \sum_{}^{}
beg + Tab  →  \begin{} \end{}
sq  + Tab  →  \sqrt{}
```

**Context-aware** — snippets only trigger in the right context:
- Math-mode snippets (like `sr`, `//`, `alpha`) only expand when you're inside a math node
- Text-mode snippets (like `mk`, `dm`) only expand outside math nodes
- This prevents accidents: typing "disregard" won't trigger `sr` → `^2`

### 5.2 Auto-Expand Snippets

These are the most powerful snippets — they trigger instantly as you type the last character:

**Essential (learn these first):**

| Type | Trigger | Result | Example |
|------|---------|--------|---------|
| Fraction | `//` | `\frac{□}{□}` | Type `//`, cursor lands in numerator |
| Squared | `sr` | `^2` | Type `xsr` → `x^2` |
| Cubed | `cb` | `^3` | Type `xcb` → `x^3` |
| Superscript | `td` | `^{□}` | Type `xtd` → `x^{□}` |
| Subscript | `__` | `_{□}` | Type `x__` → `x_{□}` |
| Auto subscript | letter + digit | `letter_digit` | Type `x2` → `x_2` |
| Right arrow | `->` | `\to` | Type `f:X->Y` → `f:X\to Y` |
| Implies | `=>` | `\implies` | Type `A=>B` → `A\implies B` |
| Infinity | `ooo` or `OO` | `\infty` | Type `OO` → `\infty` |
| Dots | `...` | `\ldots` | Type `1,2,...` → `1,2,\ldots` |

**Smart fraction**: Type a number or expression, then `/`:

| You type | You get |
|----------|---------|
| `3/` | `\frac{3}{}` |
| `4\pi^2/` | `\frac{4\pi^2}{}` |
| `(1+2+3)/` | `\frac{1+2+3}{}` |

**Postfix decorations**: Type a letter, then the decoration name:

| You type | You get | Meaning |
|----------|---------|---------|
| `xbar` | `\overline{x}` | x with overline |
| `xhat` | `\hat{x}` | x with hat |
| `xtil` | `\tilde{x}` | x with tilde |
| `xvec` | `\vec{x}` | x with arrow |
| `xdot` | `\dot{x}` | x with dot |
| `xddot` | `\ddot{x}` | x with double dot |

This matches how a professor writes: first the letter, then adds the decoration on top.

### 5.3 Tab-Expand Snippets

Type the trigger, then press **Tab**:

| Trigger + Tab | Result | Use |
|---------------|--------|-----|
| `sum` | `\sum_{}^{}` | Summation with limits |
| `prod` | `\prod_{}^{}` | Product with limits |
| `int` | `\int_{}^{} \, d` | Integral with limits and differential |
| `lim` | `\lim_{→}` | Limit |
| `part` | `\frac{\partial}{\partial}` | Partial derivative |
| `sq` | `\sqrt{}` | Square root |
| `beg` | `\begin{} \end{}` | Generic environment |
| `ali` | `\begin{aligned} \end{aligned}` | Aligned equations |
| `case` | `\begin{cases} \end{cases}` | Piecewise function |
| `pmat` | `\begin{pmatrix} \end{pmatrix}` | Parenthesized matrix |
| `bmat` | `\begin{bmatrix} \end{bmatrix}` | Bracketed matrix |
| `tt` | `\text{}` | Text in math mode |
| `bf` | `\mathbf{}` | Bold math |
| `cal` | `\mathcal{}` | Calligraphic |
| `set` | `\{ \}` | Set braces |
| `norm` | `\left\| \right\|` | Norm |

### 5.4 Tab Stop Navigation

Many snippets have multiple placeholders. After expansion:

1. Your cursor is placed at the first placeholder (`$1`)
2. Press **Tab** to jump to the next placeholder (`$2`)
3. Press **Shift+Tab** to jump back
4. After the last placeholder, Tab exits the snippet

**Example — Fraction:**
```
Step 1: Type //
        Result: \frac{|}{□}     (cursor at |, the numerator)
Step 2: Type 'x+1'
        Result: \frac{x+1|}{□}
Step 3: Press Tab
        Result: \frac{x+1}{|}   (cursor jumps to denominator)
Step 4: Type '2'
        Result: \frac{x+1}{2|}
Step 5: Press Tab
        Result: \frac{x+1}{2}|  (cursor exits the fraction)
```

**Example — Summation:**
```
Step 1: Type 'sum' + Tab
        Result: \sum_{|}{□}
Step 2: Type 'i=1'
        Result: \sum_{i=1|}^{□}
Step 3: Press Tab
        Result: \sum_{i=1}^{|}
Step 4: Type 'n'
        Result: \sum_{i=1}^{n|}
Step 5: Press Tab → cursor exits
```

### 5.5 Complete Snippet Reference

Click the **Snippets** button in the top-right to open the searchable snippet reference panel. You can:

- Browse all snippets by category
- Search by trigger, result, or description
- See whether each snippet is auto-expand or tab-expand
- See whether it works in math mode, text mode, or both

---

## 6. Theorem Environments

### 6.1 Available Environments

MathFlow supports eight theorem-like environments, each with distinct styling:

| Environment | Color | Text Style | Use For |
|-------------|-------|------------|---------|
| **Theorem** | Blue left border | Italic body | Major results |
| **Lemma** | Blue left border | Italic body | Helper results |
| **Proposition** | Blue left border | Italic body | Intermediate results |
| **Corollary** | Blue left border | Italic body | Consequences of theorems |
| **Definition** | Green left border | Normal body | Defining new concepts |
| **Proof** | Gray left border | Normal body | Proofs of results |
| **Remark** | Yellow left border | Normal body | Side notes |
| **Example** | Pink left border | Normal body | Illustrative examples |

### 6.2 Inserting Environments

**Method 1: Toolbar dropdown**
- Click the **+ Environment** dropdown in the toolbar
- Select the desired environment type

**Method 2: Tab-expand snippets (in text mode)**
| Trigger + Tab | Environment |
|---------------|-------------|
| `thm` | Theorem |
| `lem` | Lemma |
| `prop` | Proposition |
| `prf` | Proof |
| `def` | Definition |
| `cor` | Corollary |
| `rmk` | Remark |
| `ex` | Example |

### 6.3 Writing Inside Environments

After inserting an environment:
- A styled block appears with a header (e.g., "Theorem.")
- Type your content inside the block
- You can include math nodes (inline and display) within environments
- Press **Enter** to add new paragraphs inside the environment
- To exit the environment, press **Enter** at the end to create a new paragraph below it

**LaTeX export**: Environments are exported with proper `\begin{theorem}...\end{theorem}` structure. The preamble includes all necessary `\newtheorem` definitions.

---

## 7. AI Assistant

MathFlow's AI assistant converts natural language descriptions to LaTeX code. It supports three AI providers: OpenAI, Anthropic (Claude), and Google Gemini.

### 7.1 Setting Up AI

Before using the AI assistant, configure your API key:

1. Click **Settings** in the top-right corner
2. Select your preferred **AI Provider**:
   - **OpenAI** — requires an API key from [platform.openai.com/api-keys](https://platform.openai.com/api-keys)
   - **Anthropic** — requires an API key from [console.anthropic.com](https://console.anthropic.com/settings/keys)
   - **Google Gemini** — requires an API key from [aistudio.google.com/apikey](https://aistudio.google.com/apikey) (has free quota!)
3. Enter your **API Key**
4. Select a **Model** (recommended defaults are pre-selected)
5. Click **Test Connection** to verify
6. Click **Save Settings**

> **Security**: Your API key is stored only in your browser's localStorage. It is never saved on our servers — it's only temporarily held in memory during API forwarding.

**Recommended models:**

| Provider | Model | Best For |
|----------|-------|----------|
| OpenAI | GPT-4o (default) | Everyday use |
| OpenAI | GPT-4o Mini | Simple symbols, lower cost |
| OpenAI | GPT-4.1 | Complex diagrams |
| Anthropic | Claude Sonnet 4.5 (default) | Everyday use |
| Anthropic | Claude Haiku 4.5 | Fastest, simple lookups |
| Anthropic | Claude Opus 4.6 | Complex reasoning |
| Gemini | Gemini 2.5 Flash (default) | Free quota, everyday use |
| Gemini | Gemini 2.5 Pro | Complex reasoning |

### 7.2 Using the AI Panel

1. Press **Ctrl+K** (or click the **AI** button in the toolbar)
2. A popup appears near your cursor
3. Type a description of the math you want in any language (English, Chinese, etc.)
4. Press **Enter**
5. The AI generates LaTeX code and shows:
   - The raw LaTeX source (editable)
   - A KaTeX-rendered preview
6. Press **Enter** to insert the formula into your document
7. Press **Esc** to cancel

### 7.3 Effective Prompts

The AI works best with clear, specific descriptions:

**Simple symbols:**
| Prompt | Result |
|--------|--------|
| "alpha" | `\alpha` |
| "that upside-down A symbol" | `\forall` |
| "element of" | `\in` |

**Expressions:**
| Prompt | Result |
|--------|--------|
| "x squared plus y squared equals r squared" | `x^2 + y^2 = r^2` |
| "integral from 0 to infinity of e to the minus x dx" | `\int_0^{\infty} e^{-x} \, dx` |
| "partial derivative of f with respect to x" | `\frac{\partial f}{\partial x}` |
| "limit as x approaches 0 of sin x over x" | `\lim_{x \to 0} \frac{\sin x}{x}` |

**Matrices:**
| Prompt | Result |
|--------|--------|
| "3x3 identity matrix" | `\begin{pmatrix} 1 & 0 & 0 \\ ... \end{pmatrix}` |
| "2x2 matrix with a b c d" | `\begin{pmatrix} a & b \\ c & d \end{pmatrix}` |

**Complex structures:**
| Prompt | Result |
|--------|--------|
| "piecewise function: f(x) = x if x >= 0, -x if x < 0" | `\begin{cases}` environment |
| "the exact sequence 0 → A → B → C → 0" | `0 \to A \to B \to C \to 0` |
| "tensor product of V and W" | `V \otimes W` |
| "for all x in R, there exists y" | `\forall x \in \mathbb{R}, \exists y` |

**Chinese prompts also work:**
| Prompt | Result |
|--------|--------|
| "x 的平方" | `x^2` |
| "f 對 x 的偏微分" | `\frac{\partial f}{\partial x}` |
| "3x3單位矩陣" | `\begin{pmatrix} 1 & 0 & 0 \\ ... \end{pmatrix}` |
| "兩行對齊方程" | `\begin{aligned} ... \end{aligned}` |

### 7.4 Editing AI Output

After the AI generates LaTeX:
- The source code is displayed in the popup
- Click the source code (or press **Tab**) to edit it manually
- The preview updates in real-time as you edit
- Press **Enter** when satisfied to insert

This is useful for fine-tuning AI output — for example, if the AI generates `\phi` but you prefer `\varphi`.

### 7.5 Troubleshooting AI

| Problem | Solution |
|---------|----------|
| "Please configure your API Key in settings first" | Open Settings and enter your API key |
| "API Key is invalid or expired" | Check your API key is correct and active |
| "Too many requests" | Wait a moment — this is your API quota limit |
| "Service temporarily unavailable" | The backend server may be down; restart it |
| "Network connection failed" | Check your internet connection |
| Preview shows "Render error" | The LaTeX may use commands KaTeX doesn't support; edit the source |
| AI returns wrong formula | Try rephrasing your prompt or edit the source directly |

---

## 8. LaTeX Export

### 8.1 Exporting to .tex

1. Click the **Export .tex** button in the toolbar
2. A `.tex` file downloads to your computer
3. The filename matches your note title (e.g., "Lecture 1.tex")

### 8.2 Export Structure

The exported file includes:

```latex
\documentclass[12pt]{article}
\usepackage[utf8]{inputenc}
\usepackage[T1]{fontenc}
\usepackage{amsmath, amssymb, amsthm}
\usepackage{mathtools}
\usepackage{enumerate}
\usepackage{hyperref}
\usepackage{geometry}
\geometry{margin=1in}

% Theorem environment definitions
\newtheorem{theorem}{Theorem}[section]
\newtheorem{lemma}[theorem]{Lemma}
\newtheorem{proposition}[theorem]{Proposition}
...

\begin{document}

% Your content here, with:
% - \section{}, \subsection{} for headings
% - $...$ for inline math
% - \[...\] for display math
% - \begin{theorem}...\end{theorem} for environments
% - \textbf{}, \textit{}, \underline{} for formatting
% - \begin{itemize}, \begin{enumerate} for lists

\end{document}
```

### 8.3 Compiling the Exported File

The exported `.tex` file is ready to compile with any standard LaTeX distribution:

**Using Overleaf:**
1. Go to [overleaf.com](https://overleaf.com)
2. Create a new project → Upload Project
3. Upload your `.tex` file
4. Click "Recompile"

**Using local LaTeX (TeX Live / MiKTeX):**
```bash
pdflatex notes.tex
# or for bibtex support:
pdflatex notes.tex && bibtex notes && pdflatex notes.tex && pdflatex notes.tex
```

**Using VS Code + LaTeX Workshop:**
1. Install the LaTeX Workshop extension
2. Open the `.tex` file
3. Press `Ctrl+Alt+B` to build

---

## 9. Keyboard Shortcuts Reference

### Global Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+K` / `Cmd+K` | Open AI Assistant |
| `Ctrl+B` | Bold |
| `Ctrl+I` | Italic |
| `Ctrl+U` | Underline |
| `Ctrl+Z` | Undo |
| `Ctrl+Shift+Z` | Redo |

### In Math Edit Mode

| Key | Action |
|-----|--------|
| `Enter` | Exit inline math (save & render) |
| `Ctrl+Enter` | Exit display math (save & render) |
| `Escape` | Exit math (save & render) |
| `Backspace` (empty) | Delete the math node |
| `Tab` | Jump to next tab stop |
| `Shift+Tab` | Jump to previous tab stop |

### In AI Popup

| Key | Action |
|-----|--------|
| `Enter` | Generate (in input) / Insert (in preview) / Retry (on error) |
| `Escape` | Close popup |
| `Tab` | Switch to source editing mode (in preview) |

### Theorem Environments (in text mode)

| Trigger + Tab | Environment |
|---------------|-------------|
| `thm` + Tab | Insert Theorem |
| `def` + Tab | Insert Definition |
| `prf` + Tab | Insert Proof |
| `lem` + Tab | Insert Lemma |
| `prop` + Tab | Insert Proposition |
| `cor` + Tab | Insert Corollary |
| `rmk` + Tab | Insert Remark |
| `ex` + Tab | Insert Example |

### Snippet Triggers (in math mode)

| Key sequence | Action |
|--------------|--------|
| `//` | Auto-expand: fraction |
| `sr` | Auto-expand: squared |
| `cb` | Auto-expand: cubed |
| `->` | Auto-expand: right arrow |
| `=>` | Auto-expand: implies |
| `trigger + Tab` | Tab-expand snippet |

---

## 10. Complete Snippet Tables

> **Legend**: **Auto** = triggers instantly as you type. **Tab** = type trigger then press Tab. **Math** = only works inside math nodes. **Text** = only in text mode. **Both** = works everywhere.

### 10.1 Fractions & Superscripts

| Trigger | Result | Type | Context |
|---------|--------|------|---------|
| `//` | `\frac{□}{□}` | Auto | Math |
| `digit/` | `\frac{digit}{□}` | Auto | Math |
| `expression/` | `\frac{expression}{□}` | Auto | Math |
| `sr` | `^2` | Auto | Math |
| `cb` | `^3` | Auto | Math |
| `td` | `^{□}` | Auto | Math |
| `__` | `_{□}` | Auto | Math |
| `compl` | `^{c}` | Auto | Math |
| `invs` | `^{-1}` | Auto | Math |
| letter + digit | `letter_digit` | Auto | Math |
| letter + `_` + 2 digits | `letter_{digits}` | Auto | Math |

### 10.2 Greek Letters

| Trigger | Result | Trigger | Result |
|---------|--------|---------|--------|
| `alpha` | `\alpha` | `Alpha` | `\Alpha` |
| `beta` | `\beta` | `gamma` | `\gamma` |
| `Gamma` | `\Gamma` | `delta` | `\delta` |
| `Delta` | `\Delta` | `epsilon` | `\varepsilon` |
| `zeta` | `\zeta` | `eta` | `\eta` |
| `theta` | `\theta` | `Theta` | `\Theta` |
| `iota` | `\iota` | `kappa` | `\kappa` |
| `lambda` | `\lambda` | `Lambda` | `\Lambda` |
| `mu` | `\mu` | `nu` | `\nu` |
| `xi` | `\xi` | `Xi` | `\Xi` |
| `pi` | `\pi` | `Pi` | `\Pi` |
| `rho` | `\rho` | `sigma` | `\sigma` |
| `Sigma` | `\Sigma` | `tau` | `\tau` |
| `upsilon` | `\upsilon` | `phi` | `\varphi` |
| `Phi` | `\Phi` | `chi` | `\chi` |
| `psi` | `\psi` | `Psi` | `\Psi` |
| `omega` | `\omega` | `Omega` | `\Omega` |

All Greek letter snippets are **auto-expand** in **math mode** and require a word boundary.

### 10.3 Arrows & Relations

| Trigger | Result | Type |
|---------|--------|------|
| `->` | `\to` | Auto |
| `<-` | `\leftarrow` | Auto |
| `<->` | `\leftrightarrow` | Auto |
| `=>` | `\implies` | Auto |
| `=<` | `\impliedby` | Auto |
| `iff` | `\iff` | Auto |
| `!>` | `\mapsto` | Auto |
| `>->` | `\hookrightarrow` | Auto |
| `->>` | `\twoheadrightarrow` | Auto |
| `~>` | `\rightsquigarrow` | Auto |
| `uarr` | `\uparrow` | Tab |
| `darr` | `\downarrow` | Tab |

### 10.4 Sets & Logic

| Trigger | Result | Type |
|---------|--------|------|
| `NN` | `\mathbb{N}` | Auto |
| `ZZ` | `\mathbb{Z}` | Auto |
| `QQ` | `\mathbb{Q}` | Auto |
| `RR` | `\mathbb{R}` | Auto |
| `CC` | `\mathbb{C}` | Auto |
| `FF` | `\mathbb{F}` | Auto |
| `HH` | `\mathbb{H}` | Auto |
| `cc` | `\subset` | Auto |
| `ccc` | `\subseteq` | Auto |
| `inn` | `\in` | Auto |
| `notin` | `\notin` | Auto |
| `Nn` | `\cap` | Auto |
| `UU` | `\cup` | Auto |
| `EE` | `\exists` | Auto |
| `AA` | `\forall` | Auto |
| `eset` | `\emptyset` | Auto |
| `set` | `\{□\}` | Tab |
| `neg` | `\neg` | Tab |
| `land` | `\land` | Tab |
| `lor` | `\lor` | Tab |

### 10.5 Operators & Calculus

| Trigger | Result | Type |
|---------|--------|------|
| `lim` | `\lim_{□ \to □}` | Tab |
| `sum` | `\sum_{□}^{□}` | Tab |
| `prod` | `\prod_{□}^{□}` | Tab |
| `int` | `\int_{□}^{□} □ \, d□` | Tab |
| `oint` | `\oint_{□}` | Tab |
| `dint` | `\int_{-\infty}^{\infty}` | Tab |
| `part` | `\frac{\partial □}{\partial □}` | Tab |
| `nabla` | `\nabla` | Auto |
| `grad` | `\nabla` | Tab |
| `div` | `\nabla \cdot` | Tab |
| `curl` | `\nabla \times` | Tab |
| `**` | `\cdot` | Auto |
| `xx` | `\times` | Auto |
| `!=` | `\neq` | Auto |
| `<=` | `\le` | Auto |
| `>=` | `\ge` | Auto |
| `~~` | `\sim` | Auto |
| `~=` | `\cong` | Auto |
| `+-` | `\pm` | Auto |
| `-+` | `\mp` | Auto |
| `ooo` / `OO` | `\infty` | Auto |
| `...` | `\ldots` | Auto |
| `equiv` | `\equiv` | Tab |
| `approx` | `\approx` | Tab |
| `det` | `\det` | Tab |
| `dim` | `\dim` | Tab |
| `ker` | `\ker` | Tab |
| `img` | `\operatorname{Im}` | Tab |
| `hom` | `\operatorname{Hom}` | Tab |
| `otimes` | `\otimes` | Tab |
| `oplus` | `\oplus` | Tab |
| `wedge` | `\wedge` | Tab |

### 10.6 Decorations

**Postfix (auto-expand, write letter first):**

| Trigger | Result |
|---------|--------|
| `xbar` | `\overline{x}` |
| `xhat` | `\hat{x}` |
| `xtil` | `\tilde{x}` |
| `xdot` | `\dot{x}` |
| `xddot` | `\ddot{x}` |
| `xvec` | `\vec{x}` |

(Replace `x` with any letter: `phat` → `\hat{p}`, `vbar` → `\overline{v}`)

**Prefix (tab-expand):**

| Trigger + Tab | Result |
|---------------|--------|
| `bar` | `\overline{□}` |
| `hat` | `\hat{□}` |
| `til` | `\tilde{□}` |
| `what` | `\widehat{□}` |
| `wtil` | `\widetilde{□}` |
| `und` | `\underline{□}` |
| `conj` | `\overline{□}` |

### 10.7 Environments & Matrices

| Trigger + Tab | Result | Context |
|---------------|--------|---------|
| `beg` | `\begin{□} \end{□}` | Both |
| `ali` | `\begin{aligned} \end{aligned}` | Math |
| `case` | `\begin{cases} \end{cases}` | Math |
| `pmat` | `\begin{pmatrix} \end{pmatrix}` | Math |
| `bmat` | `\begin{bmatrix} \end{bmatrix}` | Math |
| `vmat` | `\begin{vmatrix} \end{vmatrix}` | Math |
| `mat` | `\begin{matrix} \end{matrix}` | Math |
| `arr` | `\begin{array}{□} \end{array}` | Math |
| `thm` | `\begin{theorem} \end{theorem}` | Text |
| `lem` | `\begin{lemma} \end{lemma}` | Text |
| `prf` | `\begin{proof} \end{proof}` | Text |
| `def` | `\begin{definition} \end{definition}` | Text |
| `cor` | `\begin{corollary} \end{corollary}` | Text |
| `rmk` | `\begin{remark} \end{remark}` | Text |
| `ex` | `\begin{example} \end{example}` | Text |

### 10.8 Functions

| Trigger | Result | Type |
|---------|--------|------|
| `sin` | `\sin` | Auto |
| `cos` | `\cos` | Auto |
| `tan` | `\tan` | Auto |
| `cot` | `\cot` | Auto |
| `sec` | `\sec` | Auto |
| `csc` | `\csc` | Auto |
| `asin` | `\arcsin` | Auto |
| `acos` | `\arccos` | Auto |
| `atan` | `\arctan` | Auto |
| `ln` | `\ln` | Auto |
| `log` | `\log` | Auto |
| `exp` | `\exp` | Auto |
| `sinh` | `\sinh` | Auto |
| `cosh` | `\cosh` | Auto |
| `tanh` | `\tanh` | Auto |
| `gcd` | `\gcd` | Tab |
| `lcm` | `\operatorname{lcm}` | Tab |
| `deg` | `\deg` | Tab |
| `arg` | `\arg` | Tab |
| `sq` | `\sqrt{□}` | Tab |

### 10.9 Brackets

| Trigger + Tab | Result |
|---------------|--------|
| `lr(` | `\left( □ \right)` |
| `lr[` | `\left[ □ \right]` |
| `lr{` | `\left\{ □ \right\}` |
| `lr\|` | `\left\| □ \right\|` |
| `lr<` | `\left\langle □ \right\rangle` |
| `ceil` | `\lceil □ \rceil` |
| `floor` | `\lfloor □ \rfloor` |
| `norm` | `\left\\| □ \right\\|` |

### 10.10 Formatting

| Trigger + Tab | Result | Use |
|---------------|--------|-----|
| `tt` | `\text{□}` | Text in math mode |
| `bf` | `\mathbf{□}` | Bold math |
| `cal` | `\mathcal{□}` | Calligraphic (e.g., sets) |
| `frak` | `\mathfrak{□}` | Fraktur (e.g., Lie algebras) |
| `scr` | `\mathscr{□}` | Script |

### 10.11 Miscellaneous Symbols

| Trigger | Result | Type |
|---------|--------|------|
| `ooo` | `\infty` | Auto |
| `OO` | `\infty` | Auto |
| `lll` | `\ell` | Auto |
| `dag` | `\dagger` | Tab |
| `cdot` | `\cdots` | Tab |
| `**` | `\cdot` | Auto |
| `xx` | `\times` | Auto |

---

## 11. FAQ & Troubleshooting

### General

**Q: Where is my data stored?**
A: Locally in your browser's localStorage and IndexedDB (for offline use). If you are logged in with an account, your notes are also synced to the server's PostgreSQL database. Clearing browser data will delete local copies, but cloud-synced data remains on the server.

**Q: Can I use MathFlow offline?**
A: Yes. MathFlow uses a Service Worker and IndexedDB for offline support. The editor, snippets, math rendering, and saved notes all work offline. AI features and cloud sync require internet access.

**Q: What LaTeX commands does KaTeX support?**
A: KaTeX supports most standard math LaTeX commands. See the [full list of supported functions](https://katex.org/docs/supported.html). Notable exclusions: `tikz`, `pgfplots`, `tikz-cd`. For these, use the AI assistant which will find KaTeX-compatible alternatives.

**Q: My exported .tex file doesn't compile!**
A: Make sure you have the required packages installed: `amsmath`, `amssymb`, `amsthm`, `mathtools`, `hyperref`. These are included in standard LaTeX distributions (TeX Live, MiKTeX). If compiling on Overleaf, it should work out of the box.

### Snippets

**Q: A snippet isn't triggering — what's wrong?**
A: Check these things:
1. **Context**: Are you in math mode? Most snippets only work inside a math node. The `$` and `dm` snippets only work in text mode.
2. **Word boundary**: Some snippets require a word boundary before them. For example, typing "integral" won't trigger `int` because there's no boundary — type a space first.
3. **Tab vs Auto**: Tab-expand snippets need you to press Tab after the trigger. Check the snippet panel for the trigger type.

**Q: I typed `alpha` but nothing happened.**
A: Greek letter snippets are auto-expand but require a word boundary. Make sure you type `alpha` after a space, operator, or at the start of the expression — not in the middle of a word.

**Q: How do I type a literal `//` without triggering the fraction snippet?**
A: The fraction snippet only triggers in math mode. In text mode, `//` types normally.

**Q: The auto-subscript (letter + digit) is triggering when I don't want it.**
A: This is by design for faster input. If you need a literal `a1` without subscript, use a backslash: `a{1}` or type `a` then `{1}`.

### Math Editing

**Q: I can't see the math source code!**
A: Click on the rendered formula to enter edit mode. The source code appears in a yellow-highlighted input field.

**Q: My display math keeps rendering inline.**
A: Make sure you use the **∫ Display** button or the `dm` snippet. Display math should be on its own line (block-level), not within a paragraph.

**Q: KaTeX shows a red error in my formula.**
A: The LaTeX may have a syntax error. Common issues:
- Missing closing braces `}`
- Unmatched `\left` / `\right`
- Using a command KaTeX doesn't support (e.g., `\tikz`)
- Missing backslash (e.g., `frac` instead of `\frac`)

### AI Assistant

**Q: The AI panel isn't opening when I press Ctrl+K.**
A: Make sure your cursor is in the editor (click the editor area first). If you're inside a math node's edit mode, exit it first (press Escape), then try Ctrl+K.

**Q: Which AI provider should I use?**
A:
- **Gemini 2.5 Flash** (free quota) — best for getting started without cost
- **GPT-4o** — excellent quality, good speed
- **Claude Sonnet 4.5** — great at following precise instructions

**Q: The AI generates wrong LaTeX. How do I fix it?**
A: After generation, press **Tab** to enter source editing mode. Modify the LaTeX directly, and the preview updates in real-time. Press Enter to insert the corrected version.

---

## 12. Tips for Lecture Note-Taking

### Before the Lecture

1. Create a notebook for the course
2. Create a note for the day's lecture
3. Pre-write the title and section headings if you know the topic

### During the Lecture

1. **Start with text mode** — write a brief description of what the professor is saying
2. **Switch to math mode with `$`** when formulas appear
3. **Use auto-expand snippets** for speed:
   - `//` for fractions (faster than `\frac{}{}`)
   - `sr` for squared (faster than `^2`)
   - `->` for arrows (faster than `\to`)
4. **Use postfix decorations** to match the professor's writing order:
   - Professor writes "x", then adds a bar → you type `xbar`
   - Professor writes "p", then adds a hat → you type `phat`
5. **Use display math** (`dm`) for important equations that should stand out
6. **Don't worry about perfection** — you can edit after class

### The Learning Curve

**Week 1**: Learn these 10 snippets:
- `$` (enter math), `//` (fraction), `sr` (squared), `cb` (cubed), `td` (superscript)
- `__` (subscript), `->` (arrow), `=>` (implies), `RR` (real numbers), `inn` (element of)

**Week 2**: Add these:
- Greek letters: `alpha`, `beta`, `gamma`, `delta`, `epsilon`, `lambda`, `sigma`, `omega`
- Operators: `sum`, `int`, `lim`, `part`
- Decorations: `xbar`, `xhat`, `xtil`

**Week 3**: You're fast enough to keep up with most lectures. Add:
- Tab-expand: `beg`, `ali`, `case`, `pmat`
- Sets: `NN`, `ZZ`, `QQ`, `RR`, `CC`, `EE`, `AA`
- Brackets: `lr(`, `lr[`, `norm`

**Week 4+**: You've mastered the core. Explore the full snippet reference for specialized symbols.

### After the Lecture

1. Review and clean up your notes
2. Add theorem/definition environments around important results
3. Use AI (Ctrl+K) for any complex formulas you couldn't capture in real-time
4. Export to LaTeX for a polished version
