#! /bin/bash

while true; do
	read -p "Username: " username
	read -s -p "Password: " pass
	echo ""

	json_payload=$(jq -n \
		--arg user "$username" \
		--arg pass "$pass" \
		'{email: $user, password: $pass}')
		
	response=$(curl -s --location --request POST 'https://public-api.cloud.meater.com/v1/login' \
	--header 'Content-Type: application/json' \
	--data "$json_payload")
	
	if ! echo "$response" | jq empty 2>/dev/null; then
        	echo "Error: Invalid response from server."
        	continue
    	fi	

	status=$(echo "$response" | jq -r '.status')

	if [ "$status" == "OK" ]; then
		echo "Login successful."
		break
	else
		echo "Login failed."
	fi
done

    token=$(echo $response | jq -r '.data.token')
    while true; do
	devices=$(curl -s  --location --request GET 'https://public-api.cloud.meater.com/v1/devices' \
		--header "Authorization: Bearer $token")
	if ! echo "$devices" | jq empty 2>/dev/null; then
		echo "Error: Invalid response from server."
		sleep 10
		continue
	elif echo "$devices" | jq -e '.data.devices | length == 0' >/dev/null 2>&1; then
		echo "Error: No devices found"
		sleep 10
		continue
	else
		ID=$(echo "$devices" | jq -r '.data.devices[0].id')
		break
	fi
    done
    highest_num=$(ls data/data*.dat 2>/dev/null | grep -oE '[0-9]+' | sort -n | tail -1)

    # If no existing files, start with data1.dat
    if [ -z "$highest_num" ]; then
        next_num=1
    else
        next_num=$((highest_num + 1))
    fi

    # Construct the new filename
    new_file="data/data${next_num}.dat"

    touch "$new_file"

    echo $(date '+%Y-%m-%d %H:%M:%S') >> "$new_file"
    echo "Elapsed Time, Internal, External" >> "$new_file"
    echo "" >> "$new_file"

    SECONDS=0

    while true; do
        # Fetch data from the API
        response2=$(curl -s --location --request GET "https://public-api.cloud.meater.com/v1/devices/$ID" \
		--header "Authorization: Bearer $token")

	internal=$(echo "$response2" | jq -r '.data.temperature.internal // "N/A"')
	external=$(echo "$response2" | jq -r '.data.temperature.ambient // "N/A"')

        # Validate response is JSON before logging
        if echo "$response" | jq empty 2>/dev/null; then
	    echo "$SECONDS, $internal, $external"
	    echo "$SECONDS, $internal, $external" >> "$new_file"
        else
            echo "Error: Invalid response at $timestamp"
        fi
        # Wait for 60 seconds
        sleep 60
     done
