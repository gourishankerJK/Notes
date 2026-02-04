settings.outformat = "pdf";

size(5cm);

draw((0,0)--(2cm,0)--(2cm,1cm)--(0,2cm)--cycle);
fill((0,0)--(2cm,0)--(2cm,1cm)--(0,2cm)--cycle, mediumgray);

draw((.5cm,1cm)--(1.75cm,.5cm));
dot((.5cm,1cm)); label("$x_1$",(.5cm,1cm),W);
dot((1.75cm,.5cm)); label("$x_2$",(1.75cm,.5cm),E);

//draw((0,0)--(2cm,0)--(2cm,1cm)--(1cm,.5cm)--(0,2cm)--cycle);
//fill((0,0)--(2cm,0)--(2cm,1cm)--(1cm,.5cm)--(0,2cm)--cycle, mediumgray);

//draw((.5cm,1cm)--(1.75cm,.5cm));
//dot((.5cm,1cm)); label("$x_1$",(.5cm,1cm),W);
//dot((1.75cm,.5cm)); label("$x_2$",(1.75cm,.5cm),E);
