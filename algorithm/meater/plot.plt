# gnuplot script to plot time vs temp1 and temp2
set title "Temperature vs Time"
set xlabel "Time"
set ylabel "Temperature"
set grid
set xrange[0:40000]
set arrow from 0, 94.444 to 40000, 94.444 nohead lt rgb "red"

# Plot the data from the file 'data1.dat'
plot "data1.dat" using 1:2 title "Temp1" with lines, \
     "data1.dat" using 1:3 title "Temp2" with lines
pause -1 "hold"
