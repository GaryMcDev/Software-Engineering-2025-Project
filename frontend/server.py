from flask import Flask, request, jsonify
from heat_transfer import heat_transfer

app = Flask(__name__)

@app.route('/calculate_heat_transfer', methods=['POST'])
def calculate_heat_transfer():
    try:
        data = request.get_json()
        
        # Extract parameters from the request
        meat_type = data['meat_type']
        weight = data['weight']
        time_data = data['time_data']
        internal_temp_data = data['internal_temp_data']
        external_temp_data = data['external_temp_data']
        
        # Call the heat transfer function
        result = heat_transfer(
            meat_type=meat_type,
            weight=weight,
            time_data=time_data,
            internal_temp_data=internal_temp_data,
            external_temp_data=external_temp_data
        )
        
        # Return the results as JSON
        return jsonify({
            'time_data': result[0],
            'internal_temp_data': result[1],
            'external_temp_data': result[2],
            'predicted_temp_data': result[3]
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 400

if __name__ == '__main__':
    app.run(debug=True, port=5000) 