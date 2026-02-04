settings.outformat = "pdf";

size(5cm);

import graph;

draw((-.1,0)--(pi+.1,0), arrow=Arrow());
draw((0,-1.5)--(0,1.5), arrow=Arrow());
label("$x$", (pi,0), S, p=fontsize(11pt));
label("$\sin(1/x)$", (0,1.6), E, p=fontsize(11pt));

real f(real x){
	return sqrt(x);
}
path g = graph(f,0,pi,n=1000);
//draw(g);

real f(real t){
	return sin(t) * cos(51*t);
}
path g = graph(f,0,pi,n=1000);
//draw(g,blue);

pair f(real t){
	return (1/t, sin(t));
}
draw(graph(f, 1/pi, 10^4, n=10^5), blue);
