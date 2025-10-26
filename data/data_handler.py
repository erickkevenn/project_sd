
import json
import os
from typing import List, Dict, Any, Optional

class DataHandler:
    """
    Classe para carregar e gerenciar dados mockados de arquivos JSON.
    """
    def __init__(self, data_folder: Optional[str] = None):
        """
        Inicializa o DataHandler.

        Args:
            data_folder (Optional[str]): O caminho absoluto para a pasta de dados.
                                       Se None, usa o diretório 'data' no mesmo nível do script.
        """
        if data_folder:
            self.data_path = data_folder
        else:
            # Constrói o caminho absoluto para a pasta 'data' vizinha a este script
            base_path = os.path.dirname(os.path.abspath(__file__))
            self.data_path = os.path.join(base_path)

    def get_data(self, entity_name: str) -> Optional[List[Dict[str, Any]]]:
        """
        Carrega os dados de um arquivo JSON com base no nome da entidade.

        O nome da entidade deve corresponder ao nome do arquivo JSON (sem a extensão).
        Exemplo: para carregar 'usuarios.json', o entity_name deve ser 'usuarios'.

        Args:
            entity_name (str): O nome da entidade (e do arquivo JSON).

        Returns:
            Optional[List[Dict[str, Any]]]: Uma lista de dicionários com os dados
                                             ou None se o arquivo não for encontrado.
        """
        file_path = os.path.join(self.data_path, f"{entity_name}.json")
        
        if not os.path.exists(file_path):
            print(f"Erro: Arquivo não encontrado em '{file_path}'")
            return None
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            return data
        except json.JSONDecodeError:
            print(f"Erro: Falha ao decodificar o JSON do arquivo '{file_path}'")
            return None
        except Exception as e:
            print(f"Ocorreu um erro inesperado ao ler o arquivo '{file_path}': {e}")
            return None

# Exemplo de uso:
if __name__ == '__main__':
    handler = DataHandler()
    entity_names = ['usuarios', 'processos', 'documentos', 'audiencias', 'logs']

    for entity in entity_names:
        print(f"\n--- Carregando Todos os Dados de: {entity.upper()} ---")
        data = handler.get_data(entity)
        if data:
            # Usando json.dumps para uma impressão mais legível (pretty-print)
            print(json.dumps(data, indent=2, ensure_ascii=False))
        else:
            print(f"Não foi possível carregar os dados para '{entity}'.")

    print("\n--- Testando entidade inexistente ---")
    inexistente = handler.get_data('faturas')
    if inexistente is None:
        print("Teste bem-sucedido: 'faturas' não foi encontrado.")
