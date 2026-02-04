# Notes

## Custom LaTeX Commands

This repository includes custom LaTeX style files (`kafkanotes.sty` and `preamble.sty`) with several custom commands and environments for mathematical and technical writing.

### Mathematical Font Commands (from preamble.sty)

- `\bb{x}` - Blackboard bold (e.g., `\bb{R}` for ℝ, `\bb{Z}` for ℤ)
- `\ser{x}` - Sans-serif math font
- `\bd{x}` - Bold math font
- `\bld{x}` - Bold symbol font
- `\src{x}` - Script font
- `\cl{x}` - Calligraphic font

### Special Symbols and Operators (from preamble.sty)

- `\iprod{x}{y}` - Inner product notation: ⟨x,y⟩
- `\TT` - Transpose symbol (sans-serif T)
- `\jj` - Roman j (for complex numbers)
- `\dx` - Roman d (for differentials, e.g., dx)
- `\zerovec` - Bold zero vector

### Mathematical Functions (from preamble.sty)

- `\sinc` - Sinc function
- `\crd` - Cardinality function
- `\dimn` - Dimension function
- `\nul` - Nullity function
- `\prox` - Proximal operator
- `\Fix` - Fixed point set
- `\diag` - Diagonal operator

### Display Commands (from kafkanotes.sty)

- `\Disp` - Shorthand for `\displaystyle`
- `\qe` - End of exercise marker (displays a triangle: ▽)

### Document Metadata Commands (from metadata.sty)

The `metadata.sty` file provides commands for managing document metadata across your notes:

**Basic Commands:**
- `\docauthor` - Author name (default: "Gourishanker")
- `\doccourse` - Course title (default: "Advance Convex Optimization")
- `\docinstructor` - Instructor name
- `\coursecode` - Course code (e.g., CS 101)
- `\docinstitution` - Institution name
- `\docsemester` - Semester or term (e.g., Fall 2026)
- `\authoremail` - Author email address

**Quick Setup:**
- `\setmetadata{author}{course}{instructor}` - Set author, course, and instructor in one command

**Usage Example:**
```latex
\usepackage{../latex_files/sty/metadata}
\title{\doccourse}
\author{\docauthor}
```

To customize, edit the values in `latex_files/sty/metadata.sty` or use `\renewcommand` in your document.

### Custom Environments

#### Theorem-like Environments (from kafkanotes.sty)

All theorem environments are numbered within sections and styled with colored boxes:

- `definition` - Yellow background box for definitions
- `proposition` - Brown background with left border for propositions
- `theorem` - Cyan background with left border for theorems
- `lemma` - Orange background with left border for lemmas
- `corollary` - Violet background with left border for corollaries
- `remark` / `remarks` - Green left border, no background
- `example` / `examples` - Black background (5%) or black left border
- `cthm` - Custom theorem (gray background with left border)
- `proof` - Standard proof environment
- `exercise` - Exercise environment
- `warning` - Warning box with yellow background and red warning sign

#### Alignment Environments (from kafkanotes.sty)

- `talign` / `talign*` - Text-style alignment environments (uses `\textstyle` instead of `\displaystyle`)

### Document Styling

The `kafkanotes.sty` file also configures:
- Custom title page formatting
- Sans-serif fonts for sections and headings
- Colored hyperlinks (citations in blue, others in black)
- Custom spacing for sections and paragraphs
- Fancy headers and footers support
- Margin notes configuration
