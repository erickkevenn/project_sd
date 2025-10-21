em um terminal rodar 
python .\app.py

e para testar pode usar no powershell esses comandos

Invoke-RestMethod -Uri http://127.0.0.1:5000/register -Method Post -ContentType 'application/json' -Body '{
     "nome": "Test User",
     "email": "test@example.com",
     "login": "testuser",
     "senha": "testpassword",
     "cnpj": "12345678901234",
     "razao_social": "Test Company",
     "nome_fantasia": "Test Company",
     "endereco_rua": "Test Street",
     "endereco_numero": "123",
     "endereco_bairro": "Test Neighborhood",
     "endereco_cidade": "Test City",
     "endereco_estado": "Test State",
     "endereco_cep": "12345-678"
}'

Invoke-RestMethod -Uri http://127.0.0.1:5000/login -Method Post -ContentType 'application/json' -Body '{
     "login": "testuser",
     "senha": "testpassword"
}'