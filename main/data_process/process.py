import numpy as np
import matplotlib.pyplot as plt
import scipy.integrate as sp

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
def make_plot(time, internal, external): #
    # Plot the corrected data
    plt.plot(time/3600, internal, color='r')
    plt.plot(time/3600, external, color='blue')
    plt.ylabel("Temperature [C]")
    plt.xlabel("Time [s]")
    plt.title("Internal and External Temperature")
    plt.grid()
    #plt.hlines(65, 0, 10)
    #plt.hlines(71, 0, 10)
    plt.show()

def dTdt(): # return the derivative at a point in time
    if (T_in < 71.111):
        return h*c / (m*A) * (T_ext - T_in)
    else
        return 0.1



# Actually read the data and process it, store in some arrays
filename = "../api_test/data/data1.dat" 
time, internal_temp, external_temp = read_temperature_data(filename)


