
import json
from flask import Flask, request, jsonify
import os

app = Flask(__name__)

DATA_DIR = os.path.join(os.path.dirname(__file__), 'data')
PROCESSOS_FILE = os.path.join(DATA_DIR, 'processos.json')

def read_data():
    if not os.path.exists(PROCESSOS_FILE):
        return []
    with open(PROCESSOS_FILE, 'r', encoding='utf-8') as f:
        return json.load(f)

def write_data(data):
    with open(PROCESSOS_FILE, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=4)

@app.route('/processos', methods=['GET'])
def get_processos():
    return jsonify(read_data())

@app.route('/processos/<string:processo_id>', methods=['GET'])
def get_processo(processo_id):
    processos = read_data()
    processo = next((p for p in processos if p.get('id') == processo_id), None)
    if processo:
        return jsonify(processo)
    return jsonify({'message': 'Processo not found'}), 404

@app.route('/processos', methods=['POST'])
def create_processo():
    new_processo = request.get_json()
    processos = read_data()
    ids = [int(p['id'].split('_')[-1]) for p in processos if p.get('id') and p['id'].startswith('proc_')]
    new_id_num = max(ids or [0]) + 1
    new_processo['id'] = f'proc_{new_id_num:03d}'
    processos.append(new_processo)
    write_data(processos)
    return jsonify(new_processo), 201

@app.route('/processos/<string:processo_id>', methods=['PUT'])
def update_processo(processo_id):
    updates = request.get_json()
    processos = read_data()
    processo = next((p for p in processos if p.get('id') == processo_id), None)
    if processo:
        processo.update(updates)
        write_data(processos)
        return jsonify(processo)
    return jsonify({'message': 'Processo not found'}), 404

@app.route('/processos/<string:processo_id>', methods=['DELETE'])
def delete_processo(processo_id):
    processos = read_data()
    processo = next((p for p in processos if p.get('id') == processo_id), None)
    if processo:
        processos.remove(processo)
        write_data(processos)
        return jsonify({'message': 'Processo deleted'})
    return jsonify({'message': 'Processo not found'}), 404

if __name__ == '__main__':
    app.run(port=5001, debug=True)
