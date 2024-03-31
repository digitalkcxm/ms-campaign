# Comandos

### Iniciar projeto

```bash
$ nvm use
$ npm install
$ npm run dev
```

### Teste

```bash
$ npm run test
```

### Migrate

```bash
$ npm run migrate:latest
```

# Env

```
#INFOS API
PORT='4445'
STATE_ENV='production'
NODE_ENV='production'
PROJECT_NAME='mscampaign'
LOG_LEVEL='trace'

#INFOS DB
DB_HOST = 'localhost'
DB_DATABASE = 'mscampaign'
DB_USERNAME = 'postgres'
DB_PASSWORD = 'root'

#INFOS RABBIT
RABBITMQ_USER = 'rabbit'
RABBITMQ_PASSWORD = 'root'
RABBITMQ_HOST = 'localhost'
RABBITMQ_PORT = '5672'

#INFOS SERVICES
MSCOMPANY='http://localhost:7000'
MSCRMMANAGER='http://localhost:4004'
MSWORKFLOW='http://localhost:5053'

#INFORMAÇÕES REDIS
REDIS_HOST='localhost'
REDIS_PORT='6379'

#INFORMAÇÕES APM
APM_SERVER_URL='https://apm.digitalk.com.br'
APP_ENVIRONMENT='local'

#Login Core
COREEMAIL='email@email.com'
COREPASS='pass'
```

# Banco de Dados

![Untitled](https://gitlab.digitalk.com.br/digitalk/backend/microservicos/mscampaign/-/raw/master/docs/db.png)

- company: Salva o id da company responsável por identificar o cliente que esta utilizando.

- workflow: Registra os IDs dos workflows onde é criado as campanhas.

- status: Possíveis status das campanhas criadas.
    - draft
    - scheduled
    - running
    - canceled
    - error
    - finished
    
- campaign: Armazena informações básicas sobre a campanha.
- campaign_version:  Tabela que armazena todas as configurações para execução de uma campanha.
    - **repetition_rule:** Armazena regras de repetição da campanha (Ainda não implementado).
    - **filter:** Armazena a estrutura do filtro que sera feito no CRM.
    - **negotiation:** Armazena as tabelas, campos e valores das negociações que devem ser criados no ticket.
    - **first_message:** Armazena a mensagens a serem enviadas e o volume.

# Diagrama de componentes

![Untitled](https://gitlab.digitalk.com.br/digitalk/backend/microservicos/mscampaign/-/raw/master/docs/fluxos_servicos.png)

# Endpoints

**[GET]l - /api/v1/campaign?status=["draft", "scheduled", "running", "canceled", "error", "finished"]&size=6&page=0&search=CanhaLegal:** Busca todas as campanhas da company e pode ser filtrado por status ou pelo nome da company.

[GET] - /api/v1/campaign/:ID:  Busca campanha pelo ID

[PUT] - /api/v1/campaign/:ID: Altera campanha

[POST] - /api/v1/campaign: Cria campanha

```json
{
    "name": "Teste 01",
    "create_by": 1,
    "start_date": "2024-03-22 18:22:00",
    "end_date": null,
    "id_workflow": "47e63d98-39a5-49df-854b-20da041787e4",
    "id_phase": "63d32330-18fe-4c23-a6eb-b3b492ca14a8",
    "repetition_rule": [],
    "filter": [
			{
	      "rules": [
	        {
	          "variable": "crm.cliente.nome",
	          "value": "teste",
	          "operator": "EQUAL"
	        },
	        {
	          "variable": "crm.cliente.nome",
	          "value": "asfasfs",
	          "operator": "EQUAL"
	        }
	      ],
	      "operator": "AND"
	    }    
    ],
    "draft": false,
    "ignore_open_tickets": false,
    "first_message": [
        {
            "type": "whatsapp",
            "contact_id": 1,
            "message": "Boa tarde {{crm.cliente.nome}}, tudo bem?",
            "volume": 20,
            "phone": "{{crm.contato.contato}}"
        },
        {
            "type": "sms",
            "contact_id": "2f301ccc-6c18-4492-9805-9c009993e908",
            "message": "Boa tarde {{crm.cliente.nome}}, tudo bem?",
            "volume": 20,
            "phone": "{{crm.contato.contato}}"
        },
        {
            "type": "waba",
            "contact_id": 2,
            "hsm_id": "ddebf4d3-9b78-45ec-bccf-0f4dc916c2c6",
            "message": "top",
            "volume": 60,
            "phone": "{{crm.contato.contato}}",
            "variables": {
                "1": "{{crm.cliente.nome}}"
            }
        }
    ],
    "negotiation": [
        {
            "values": {
                "atividade": [
                    "enviar-whats"
                ],
                "descricao": "descricao",
                "data_e_hora": "2024-03-26 15:59:00"
            },
            "template": "99743e4e-961f-49cf-a287-3f0931a8df94"
        }
    ]
}
```

## Filter:

```json
[
	{
		"rules": [
			{
		     "variable": "crm.cliente.nome",
	       "value": "teste",
	       "operator": "EQUAL"
	    },
	    {
	          "variable": "crm.cliente.nome",
	          "value": "asfasfs",
	          "operator": "EQUAL"
	    }
	  ],
	  "operator": "AND"
	}    
]
```

Filtro é uma lista de objetos onde terá o operador e a lista de objeto de regras que basicamente é formado pela localidade da variável “variable": "crm.cliente.nome", valor que esta filtrando “value": "teste" e operador "operator": "EQUAL".

- Os tipos de **"filter.operator”** são:
    - AND
    - OR
- Os tipos de **"filter.rules.operator”** são:
    - IN
    - NOT_IN
    - DIFFERENT
    - EQUAL
    - GREATER_THAN
    - LESS_THAN

Toda a lógica do filtro é feito dentro de **/src/service/CRMManagerService.js** no metodo **query().**

## First Message:

```json
[
        {
            "type": "whatsapp",
            "contact_id": 1,
            "message": "Boa tarde {{crm.cliente.nome}}, tudo bem?",
            "volume": 20,
            "phone": "{{crm.contato.contato}}"
        },
        {
            "type": "sms",
            "contact_id": "2f301ccc-6c18-4492-9805-9c009993e908",
            "message": "Boa tarde {{crm.cliente.nome}}, tudo bem?",
            "volume": 20,
            "phone": "{{crm.contato.contato}}"
        },
        {
            "type": "waba",
            "contact_id": 2,
            "hsm_id": "ddebf4d3-9b78-45ec-bccf-0f4dc916c2c6",
            "message": "top",
            "volume": 60,
            "phone": "{{crm.contato.contato}}",
            "variables": {
                "1": "{{crm.cliente.nome}}"
            }
        }
    ]
```

Esse cara é responsável por mandar a primeira mensagem assim que o ticket for criado, ele atualmente tem suporte:

- waba (Whatsapp Oficial Gupshup)
- whatsapp (Não oficial Digitalk)
- sms (M2C)

As variáveis nas mensagens segue a mesma lógica de automação. 

Volume contem o valor de porcentagem que deve ser enviado dentro do total de leads filtrados no CRM daquela mensagem. Sendo assim neste body ele ira mandar 20 mensagens em whatsapp, 20 mensagens no sms e 60 mensagens em whatsapp oficial no total de 100 leads. 

Essa lógica é feito no metodo #prepareMessage() dentro de /src/controller/CampaignController.js

## Negotiation:

```json
[
	{
		"values": {
			"atividade": [
				"enviar-whats"
			],
			"descricao": "descricao",
	    "data_e_hora": "2024-03-26 15:59:00"
		},
	  "template": "99743e4e-961f-49cf-a287-3f0931a8df94"
	}
]
```

Negociação é uma lista de objeto onde deve conter o template do CRM que indique a tabela que deve ser inserido esses dados e os values onde contem o objeto com a coluna e valor desta tabela. 

# Agendamento de campanha.

No momento que uma campanha é criada é enviado uma mensagem para fila scheduling_campaign onde esta mensagem só sera publicada na fila de fato na data/hora agendada, caso o usurário não informe data/hora é utilizado data/hora atual da criação da campanha e sera executado assim que salvar. 

Isso é feito pelo método **#scheduler()** dentro de **/src/controller/CampaignVersionController.js**

O consumo desta fila é realizado pelo método **campaignScheduling()** dentro de **/src/controller/QueueController.js**

# Execução da campanha.

A partir do momento que a mensagem é publicada na fila **scheduling_campaign** a execução da campanha começa a ser executada pelo método **executeCampaign()** responsável por preparar os leads, essa fase segue as seguintes etapas. 

![Untitled](https://gitlab.digitalk.com.br/digitalk/backend/microservicos/mscampaign/-/raw/master/docs/prepare_leads.png)

Finalizado essa fase, o serviço consome as mensagens publicadas na fila **campaign_create_ticket** para de fator  criar os ticket, isso é feito no método **createTicket()** dentro de **/src/controller/WorkflowController.js** seguindo as seguintes etapas.

![Untitled](https://gitlab.digitalk.com.br/digitalk/backend/microservicos/mscampaign/-/raw/master/docs/create_ticket.png)
