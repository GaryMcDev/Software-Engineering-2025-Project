import numpy as np

def heat_transfer(meat_type, weight, time_data, internal_temp_data, external_temp_data):
    """
    Calculate predicted temperature based on heat transfer model
    
    Parameters:
    meat_type (int): Type of meat (0=pork, 1=steak, 2=chicken, 3=fish, 4=lamb)
    weight (float): Weight of meat in pounds
    time_data (list): Array of time points in minutes
    internal_temp_data (list): Array of internal temperature measurements
    external_temp_data (list): Array of external temperature measurements
    
    Returns:
    tuple: (time_data, internal_temp_data, external_temp_data, predicted_temp_data)
    """
    # Convert inputs to numpy arrays for easier manipulation
    time = np.array(time_data)
    internal_temp = np.array(internal_temp_data)
    external_temp = np.array(external_temp_data)
    
    # Define heat transfer coefficients for different meat types
    heat_coefficients = {
        0: 0.15,  # Pork
        1: 0.18,  # Steak
        2: 0.12,  # Chicken
        3: 0.10,  # Fish
        4: 0.16   # Lamb
    }
    
    # Get the heat transfer coefficient for the selected meat type
    k = heat_coefficients.get(meat_type, 0.15)  # Default to pork if invalid meat type
    
    # Calculate predicted temperatures for the next 5 points
    last_time = time[-1]
    last_internal_temp = internal_temp[-1]
    last_external_temp = external_temp[-1]
    
    predicted_temps = []
    predicted_times = []
    
    # Generate 5 predicted points
    for i in range(1, 6):
        new_time = last_time + i
        # Simple heat transfer model: T_pred = T_internal + k * (T_external - T_internal) * weight_factor
        weight_factor = 1 / np.sqrt(weight)  # Weight affects heat transfer rate
        temp_diff = last_external_temp - last_internal_temp
        predicted_temp = last_internal_temp + k * temp_diff * weight_factor
        
        predicted_temps.append(predicted_temp)
        predicted_times.append(new_time)
    
    # Combine original and predicted data
    final_time = np.concatenate([time, predicted_times])
    final_internal = np.concatenate([internal_temp, predicted_temps])
    final_external = np.concatenate([external_temp, [last_external_temp] * 5])
    
    return final_time.tolist(), final_internal.tolist(), final_external.tolist(), predicted_temps 