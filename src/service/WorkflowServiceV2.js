import WorkflowDatabase from '../config/database/Workflow.js'
import { v4 } from 'uuid'
import { error, success } from '../helper/patterns/ReturnPatters.js'

export default class WorkflowServiceV2 {
  constructor(logger = {}) {
    this.logger = logger
  }

  async CreateTickets({
    id_workflow,
    id_phase,
    campaign_name,
    ignore_open_tickets,
    is_mailing,
    leads,
    customerTemplate,
    origin_channel
  }) {
    const database = GetConnection()
    const trx = await database.transaction()

    let leadsCriados = []
    let leadRelationToTicket = []
    try {

      const workflow = await this.#getWorkflow(database, id_workflow)
      const phase = await this.#getPhase(database, id_phase)
      const campaignUser_id = process.env.WORKFLOW_CAMPAIGN_USER_ID || await this.#getCampaignUser(database)

      const ticketValues = []
      const customerValues = []
      const linkCustomerValues = []
      const originValues = []
      const activityCreateTicketValues = []
      const relateTicketOnPhaseValues = []

      for (const lead of leads) {

        // Define ID de ticket e customer
        const ticket_id = v4()
        const customer_id = v4()

        ticketValues.push({
          id: ticket_id,
          name: lead.nome,
          description: `Ticket criado via campanha: ${campaign_name}`,
          id_creator: campaignUser_id,
          id_phase: id_phase,
          id_company: workflow.id_company,
          phase_name: phase.name,
          can_distribute: workflow.tickets_can_be_distributed_by_default,
          created_at: new Date().toISOString(),
        })

        if (!is_mailing) {
          customerValues.push({
            id: customer_id,
            id_ticket: ticket_id,
            id_crm: lead.id,
            table_name: customerTemplate.table,
            column_name: 'id',
            id_template: customerTemplate.id,
          })
          linkCustomerValues.push({
            ticket_id: ticket_id,
            id_customer: customer_id
          })
        }

        originValues.push({
          id: ticket_id,
          origin: 'Campaign',
          url: '',
          description: campaign_name,
          channel: origin_channel,
        })

        activityCreateTicketValues.push({
          id: v4(),
          id_ticket: ticket_id,
          id_user: campaignUser_id,
          id_reference: ticket_id,
          activity_type: 20,
          created_at: new Date().toISOString()
        })

        relateTicketOnPhaseValues.push({
          id: v4(),
          id_ticket: ticket_id,
          id_phase: id_phase,
          id_user: campaignUser_id,
          created_at: new Date().toISOString()
        })

        // Relaciona o lead ao ticket
        leadRelationToTicket.push({
          ticket_id: ticket_id,
          lead: lead
        })
      }

      const ticketsCreated = await trx('ticket').insert(ticketValues).returning([
        'id',
        'id_seq',
        'name',
        'description',
        'id_creator',
        'id_phase',
        'id_company',
        'phase_name',
        'created_at',
        'updated_at'
      ])

      await trx('ticket_origin').insert(originValues)
      await trx('activity').insert(activityCreateTicketValues)
      await trx('ticket_phase').insert(relateTicketOnPhaseValues)

      let customersCreated = []
      if (!is_mailing) {
        customersCreated = await trx('customer').insert(customerValues).returning(['id', 'id_ticket', 'id_crm', 'table_name', 'column_name', 'id_template'])
        await trx.raw(`
          UPDATE ticket
          SET id_customer = customer.id
          FROM customer
          WHERE 1=1
            and customer.id_ticket = ticket.id
            and ticket.id in (${ticketValues.map(t => `'${t.id}'`).join(',')})
        `)
      }

      leadsCriados = this.#formatLead({
        leads: leadRelationToTicket,
        ticketsCreated,
        customersCreated,
        campaign_name,
        origin_channel,
        id_workflow,
        workflow,
        customerTemplate,
        is_mailing
      })

      await trx.commit() // TODO: verificar se eu preciso dar um release na transaction
    } catch (err) {
      await trx.rollback()
      return error({ message: 'Erro ao criar tickets', error: err })
    }

    return success({ data: leadsCriados })
  }

  async #getCampaignUser(connection) {
    const user = await connection.raw(`
      select 
        id, 
        name, 
        id_company, 
        type 
      from users 
      where 1=1 
        and type = 'api'
        and name = 'Campanha';
      `)

    return user.rows?.[0].id
  }

  async #getWorkflow(connection, workflow_id) {
    const workflow = await connection('workflow')
      .select([
        'id',
        'id_company',
        'name',
        'department',
        'tickets_can_be_distributed_by_default',
      ])
      .where('id', workflow_id)
      .first()

    return workflow
  }

  async #getPhase(connection, phase_id) {
    const phase = await connection('phase')
      .select([
        'id',
        'id_company',
        'id_workflow',
        'name',
      ])
      .where('id', phase_id)
      .first()

    return phase
  }

  #formatLead({
    leads, 
    ticketsCreated, 
    customersCreated,
    campaign_name,
    origin_channel,
    id_workflow,
    workflow,
    customerTemplate,
    is_mailing
  }) {
    const leadsFormatted = []
    for(const lead of leads) {
      const foundTicket = ticketsCreated.find(t => t.id === lead.ticket_id)
      const ticket = {
        id: foundTicket.id,
        id_seq: foundTicket.id_seq,
        name: foundTicket.name,
        description: foundTicket.description,
        origin: {
          id: foundTicket.id,
          origin: 'Campaign',
          url: '',
          description: campaign_name,
          channel: origin_channel,
        },
        pending_time: null,
        last_channel_interaction: null,
        crm_price: 0,
        last_interaction_operator: '',
        last_interaction_client: '',
        responsibles: null,
        open: true,
        id_creator: foundTicket.id_creator,
        id_phase: foundTicket.id_phase,
        phase: foundTicket.phase_name,
        id_workflow: id_workflow,
        workflow: workflow.name,
        id_company: foundTicket.id_company,
        department: workflow.department,
        customer: (is_mailing) ? null : {
          id_ticket: foundTicket.id,
          id_crm: customersCreated.find(c => c.id_ticket == foundTicket.id)?.id_crm,
          table: customerTemplate.table,
          column: 'id',
          template: customerTemplate.id,
        },
        created_at: foundTicket.created_at,
        updated_at: foundTicket.updated_at
      }

      leadsFormatted.push({
        id: lead.lead.id,
        nome: lead.lead.nome,
        ticket: ticket,
        contatos: lead.lead.contatos,
        customer: lead.lead.customer,
        automation_message: lead.lead.message
      })
    }

    return leadsFormatted
  }
}

function GetConnection() {
  return WorkflowDatabase.GetConnection()
}