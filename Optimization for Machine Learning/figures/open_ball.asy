import graph;
import label;

// Settings for LaTeX labels
settings.outformat = "pdf";
settings.prc = false;
unitsize(1.5cm);

// Configuration
real epsilon = 2.0;
pen dashedPen = dashed + linewidth(1pt);
pen fillOpacity = opacity(0.2);

// Function to draw a panel with axes
void drawAxes(pair origin, string ylabel1, string ylabel2) {
    draw(origin + (-2.5,0)--origin + (2.5,0), Arrow(6));
    draw(origin + (0,-2.5)--origin + (0,2.5), Arrow(6));
    label("$y_1$", origin + (2.5,0), E);
    label("$y_2$", origin + (0,2.5), N);
    dot("$\mathbf{x}$", origin, SW);
}

// --- PANEL 1: Euclidean Norm (L2) ---
pair O1 = (0,0);
path ball2 = circle(O1, epsilon);
fill(ball2, blue + fillOpacity);
draw(ball2, blue + dashedPen);
drawAxes(O1, "y_1", "y_2");
draw(O1 -- O1 + epsilon*dir(45), black + linewidth(0.8pt), Arrow);
label("$\epsilon$", O1 + 0.5*epsilon*dir(45), NW);
label("\textbf{Euclidean Norm} ($L^2$)", (0,-3), S);
label("$\|\mathbf{v}\|_2 = \sqrt{v_1^2 + v_2^2}$", (0,-3.6), S);

// --- PANEL 2: Taxicab Norm (L1) ---
pair O2 = (6,0);
path ball1 = (O2+(epsilon,0)) -- (O2+(0,epsilon)) -- (O2+(-epsilon,0)) -- (O2+(0,-epsilon)) -- cycle;
fill(ball1, red + fillOpacity);
draw(ball1, red + dashedPen);
drawAxes(O2, "y_1", "y_2");
draw(O2 -- O2 + (0.8, 1.2), black + linewidth(0.8pt), Arrow);
label("$\mathbf{y}$", O2 + (0.8, 1.2), NE);
label("\textbf{Taxicab Norm} ($L^1$)", (6,-3), S);
label("$\|\mathbf{v}\|_1 = |v_1| + |v_2|$", (6,-3.6), S);

// --- PANEL 3: Maximum Norm (L-inf) ---
pair O3 = (12,0);
path ballInf = (O3+(-epsilon,-epsilon)) -- (O3+(epsilon,-epsilon)) -- (O3+(epsilon,epsilon)) -- (O3+(-epsilon,epsilon)) -- cycle;
fill(ballInf, heavygreen + fillOpacity);
draw(ballInf, heavygreen + dashedPen);
drawAxes(O3, "y_1", "y_2");
draw(O3 -- O3 + (epsilon, 1.5), black + linewidth(0.8pt), Arrow);
label("$\epsilon$", O3 + (epsilon, 0.75), E);
label("\textbf{Maximum Norm} ($L^\infty$)", (12,-3), S);
label("$\|\mathbf{v}\|_\infty = \max(|v_1|, |v_2|)$", (12,-3.6), S);

// General Title for the Figure
label("\Large Visualizing the Open Ball $B_{\epsilon}(\mathbf{x})$ in $\mathbb{R}^2$", (6, 4), N);