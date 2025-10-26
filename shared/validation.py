"""
Módulo de validação compartilhado para microserviços
"""
from marshmallow import Schema, fields, ValidationError
from flask import request, jsonify
from functools import wraps

class DocumentSchema(Schema):
    """Schema para validação de documentos"""
    titulo = fields.Str(required=True, validate=lambda x: len(x.strip()) > 0)
    conteudo = fields.Str(required=True, validate=lambda x: len(x.strip()) > 0)
    autor_id = fields.Str(required=True, validate=lambda x: len(x.strip()) > 0)
    processo_id = fields.Str(load_default=None)

class ProcessSchema(Schema):
    """Schema para validação de processos"""
    numero_processo = fields.Str(required=True, validate=lambda x: len(x.strip()) > 0)
    classe_processo = fields.Str(required=True, validate=lambda x: len(x.strip()) > 0)
    area_direito = fields.Str(required=True, validate=lambda x: len(x.strip()) > 0)
    data_distribuicao = fields.Str(required=True)
    valor_causa = fields.Float(required=True)
    status_processo = fields.Str(required=True, validate=lambda x: len(x.strip()) > 0)
    cliente_id = fields.Str(required=True, validate=lambda x: len(x.strip()) > 0)
    advogado_responsavel_id = fields.Str(required=True, validate=lambda x: len(x.strip()) > 0)
    tribunal = fields.Str(required=True, validate=lambda x: len(x.strip()) > 0)
    comarca = fields.Str(required=True, validate=lambda x: len(x.strip()) > 0)
    juiz_responsavel = fields.Str(required=True, validate=lambda x: len(x.strip()) > 0)
    fase_processual = fields.Str(required=True, validate=lambda x: len(x.strip()) > 0)
    descricao_processo = fields.Str(required=True, validate=lambda x: len(x.strip()) > 0)
    prioridade = fields.Str(required=True, validate=lambda x: len(x.strip()) > 0)

class DeadlineSchema(Schema):
    """Schema para validação de prazos"""
    processo_id = fields.Str(required=True, validate=lambda x: len(x.strip()) > 0)
    data_prazo = fields.Str(required=True)
    descricao = fields.Str(load_default="")
    tipo = fields.Str(load_default="")
    status = fields.Str(load_default="pendente")

class HearingSchema(Schema):
    """Schema para validação de audiências"""
    processo_id = fields.Str(required=True, validate=lambda x: len(x.strip()) > 0)
    data_hora = fields.Str(required=True)
    link_sala = fields.Str(load_default="")
    participantes_ids = fields.List(fields.Str(), load_default=[])

def validate_json(schema_class):
    """Decorator para validação de JSON usando Marshmallow"""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            try:
                schema = schema_class()
                json_data = request.get_json(force=True)
                if not json_data:
                    return jsonify({'error': 'JSON payload required'}), 400
                
                # Valida e deserializa os dados
                validated_data = schema.load(json_data)
                request.validated_data = validated_data
                return f(*args, **kwargs)
            except ValidationError as err:
                return jsonify({'error': 'Validation failed', 'details': err.messages}), 400
            except Exception as e:
                return jsonify({'error': 'Invalid JSON payload'}), 400
        return decorated_function
    return decorator
