# JurisFlow Frontend

Frontend modular e escalável para a Plataforma de Orquestração Jurídica JurisFlow.

## 🏗️ Arquitetura

O frontend foi desenvolvido seguindo padrões de engenharia de software para facilitar o desenvolvimento, manutenção e escalabilidade:

- **Arquitetura Modular**: Componentes HTML e serviços JavaScript separados
- **Padrão de Serviços**: Cada funcionalidade possui seu próprio serviço
- **Gerenciamento de Estado Centralizado**: Estado da aplicação gerenciado pela classe App
- **Sistema de Componentes**: Componentes HTML carregados dinamicamente
- **Tratamento de Erros Robusto**: Sistema centralizado de tratamento de erros

## 📁 Estrutura de Arquivos

```
ui/
├── index.html                 # Página principal
├── styles.css                # Estilos globais
├── components/               # Componentes HTML modulares
│   ├── header.html
│   ├── navigation.html
│   ├── landing-page.html
│   ├── auth-pages.html
│   ├── main-system.html
│   └── modals.html
├── js/
│   ├── app.js               # Ponto de entrada da aplicação
│   ├── core/                # Classes principais
│   │   └── App.js
│   └── services/            # Serviços modulares
│       ├── ApiService.js
│       ├── AuthService.js
│       ├── NavigationService.js
│       ├── PermissionService.js
│       ├── DocumentService.js
│       ├── DeadlineService.js
│       ├── HearingService.js
│       └── ProcessService.js
├── README.md                # Este arquivo
└── DEVELOPER_GUIDE.md       # Guia detalhado para desenvolvedores
```

## 🚀 Funcionalidades

### Autenticação e Autorização
- Login e registro de usuários
- Controle de permissões baseado em roles
- Gerenciamento de sessão com JWT

### Gerenciamento de Documentos
- Listar documentos
- Criar novos documentos
- Buscar documentos por ID
- Excluir documentos

### Controle de Prazos
- Listar prazos
- Criar novos prazos
- Visualizar prazos do dia
- Excluir prazos

### Organização de Audiências
- Listar audiências
- Agendar novas audiências
- Visualizar audiências do dia
- Cancelar audiências

### Gestão de Processos
- Listar processos
- Buscar processos por ID
- Orquestração automática de casos

## 🛠️ Tecnologias Utilizadas

- **HTML5**: Estrutura semântica e acessível
- **CSS3**: Estilos modernos com Grid e Flexbox
- **JavaScript ES6+**: Lógica da aplicação com classes e módulos
- **Font Awesome**: Ícones para interface
- **Fetch API**: Comunicação com backend

## 📋 Pré-requisitos

- Navegador web moderno (Chrome, Firefox, Safari, Edge)
- Servidor web para servir os arquivos estáticos
- Backend JurisFlow funcionando

## 🚀 Como Executar

1. **Clone o repositório**:
   ```bash
   git clone <repository-url>
   cd project_sd/ui
   ```

2. **Configure o servidor web**:
   - Use qualquer servidor web (Apache, Nginx, Python SimpleHTTPServer, etc.)
   - Configure para servir arquivos estáticos da pasta `ui/`

3. **Acesse a aplicação**:
   - Abra o navegador e acesse `http://localhost:port/ui/index.html`

## 🔧 Desenvolvimento

### Estrutura de Serviços

Cada funcionalidade possui seu próprio serviço:

```javascript
class DocumentService {
  constructor(app) {
    this.app = app;
    this.api = app.getService('api');
  }

  async list() {
    // Implementação da listagem
  }

  async create() {
    // Implementação da criação
  }
}
```

### Adicionando Novas Funcionalidades

1. **Criar serviço**: Adicione novo arquivo em `js/services/`
2. **Registrar serviço**: Adicione em `app.js`
3. **Criar componente**: Adicione HTML em `components/`
4. **Atualizar navegação**: Adicione métodos em `NavigationService`

### Convenções de Código

- **Classes**: PascalCase (`DocumentService`)
- **Métodos**: camelCase (`createDocument`)
- **Variáveis**: camelCase (`userData`)
- **IDs**: camelCase (`docTitleInput`)

## 🧪 Testes

### Testes Manuais

1. **Autenticação**:
   - Teste login com credenciais válidas
   - Teste registro de novo usuário
   - Teste logout

2. **Funcionalidades**:
   - Teste cada operação CRUD
   - Teste controle de permissões
   - Teste tratamento de erros

3. **Interface**:
   - Teste responsividade
   - Teste navegação entre páginas
   - Teste modais e formulários

### Debugging

- Use o console do navegador para logs
- Monitore requisições na aba Network
- Use breakpoints para debugging interativo

## 📚 Documentação

- **DEVELOPER_GUIDE.md**: Guia detalhado para desenvolvedores
- **Comentários no código**: Documentação inline
- **Console logs**: Logs de debug detalhados

## 🤝 Contribuição

### Antes de Contribuir

1. Leia o `DEVELOPER_GUIDE.md`
2. Entenda a arquitetura existente
3. Teste suas mudanças localmente

### Processo de Contribuição

1. Crie uma branch para sua feature
2. Implemente seguindo as convenções
3. Teste todas as funcionalidades
4. Documente as mudanças
5. Faça pull request

## 🐛 Problemas Conhecidos

- **Carregamento de componentes**: Verifique se os arquivos existem
- **Permissões**: Verifique se o usuário tem as permissões necessárias
- **API**: Verifique se o backend está funcionando

## 📈 Roadmap

### Próximas Funcionalidades

- [ ] Dashboard com métricas
- [ ] Notificações em tempo real
- [ ] Exportação de dados
- [ ] Temas personalizáveis
- [ ] PWA (Progressive Web App)

### Melhorias Técnicas

- [ ] Testes automatizados
- [ ] Bundle optimization
- [ ] Service Workers
- [ ] TypeScript migration

## 📄 Licença

Este projeto está sob a licença [MIT](LICENSE).

## 📞 Suporte

Para dúvidas ou problemas:

1. Consulte o `DEVELOPER_GUIDE.md`
2. Verifique os logs do console
3. Abra uma issue no repositório

---

**JurisFlow** - Plataforma de Orquestração Jurídica
