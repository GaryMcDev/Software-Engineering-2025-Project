import numpy as np
import matplotlib.pyplot as plt
from scipy.optimize import curve_fit

def read_temperature_data(filename):
    # Read raw file line by line (to handle potential issues)
    with open(filename, "r", encoding="utf-8") as file:
        lines = file.readlines()[3:]  # Skip the 3 header lines

    # Storage for cleaned numeric data
    cleaned_rows = []

    for line in lines:
        # Strip spaces and split the row by commas
        values = line.strip().split(",")

        # Ensure no "N/A" exists in the row
        if "N/A" in values:
            continue  # Skip this row

        try:
            # Convert values to float and store them
            cleaned_rows.append([float(v) for v in values])
        except ValueError:
            continue  # Skip rows that fail conversion

    # Convert the cleaned list to a NumPy array
    clean_data = np.array(cleaned_rows)

    # If no valid data remains, return empty arrays
    if clean_data.size == 0:
        return np.array([]), np.array([]), np.array([])

    # Remove failed pings: when both internal_temp & external_temp are unchanged
    if len(clean_data) > 1:
        internal_temp = clean_data[:, 1]
        external_temp = clean_data[:, 2]

        # Create a mask where at least one temperature has changed
        valid_mask = np.insert(
            (np.diff(internal_temp) != 0) | (np.diff(external_temp) != 0),
            0,  # Insert True at the beginning to keep the first row
            True
        )

        clean_data = clean_data[valid_mask]

    # Extract columns into separate arrays
    time = clean_data[:, 0]
    internal_temp = clean_data[:, 1]
    external_temp = clean_data[:, 2]

    return time, internal_temp, external_temp

filename = "real_data.dat" 
time, internal_temp, external_temp = read_temperature_data(filename)

points = 150

T0 = internal_temp[0]
Text=external_temp.mean()
print(T0, Text)

def model_function(t, c):
    return (T0-Text)*np.exp(-c*t) + Text

# Fit the model to the data
params, covariance = curve_fit(model_function, time[:points], internal_temp[:points], p0=[0.00007])
c_fit = params
print(c_fit)

# Generate smooth curve for plotting
t_smooth = np.linspace(0, 46800, 100)
T_smooth = model_function(t_smooth, c_fit)

# Plot data, fitted curve, and extrapolated point
plt.scatter(time, internal_temp, label='Data', color='red')
plt.scatter(time, external_temp, label='External', color='green')
plt.axvline(x=time[points])
plt.axhline(y=95)
plt.plot(t_smooth, T_smooth, label='Fitted Curve', color='blue')
plt.xlabel('Time')
plt.ylabel('Measured Value')
plt.legend()
plt.title('Curve Fitting and Extrapolation')
plt.grid()
plt.show()

