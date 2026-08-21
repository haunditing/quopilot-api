import { registerCapability } from "../../../capabilities/registry.js";

import { requestHumanHandoff as requestHumanHandoffRecord } from "../../agent-conversation-service.js";
import {
  failResult,
  okResult,
  type AgentTool,
  type AgentToolContext,
} from "../types.js";

export const requestHumanHandoffTool: AgentTool = {
  name: "requestHumanHandoff",
  description:
    "Escala la conversación actual a un agente humano. Se usa cuando el cliente lo pide, cuando no se puede resolver su solicitud o cuando las reglas lo requieran. Si no hay agentes humanos disponibles, devuelve un mensaje informándolo sin escalar.",
  kind: "WRITE",
  parameters: {
    type: "object",
    properties: {
      reason: {
        type: "string",
        description: "Motivo por el que se solicita la intervención humana",
      },
    },
    additionalProperties: false,
  },

  async execute(ctx: AgentToolContext, args) {
    try {
      const result = await requestHumanHandoffRecord(
        ctx.tenantId,
        ctx.conversationId,
        ctx.customerId,
        typeof args.reason === "string" ? args.reason : undefined,
      );

      return okResult(result);
    } catch (error) {
      return failResult(
        error instanceof Error
          ? error.message
          : "Unable to request human handoff",
      );
    }
  },
};

export const handoffTools: AgentTool[] = [requestHumanHandoffTool];

registerCapability({
  module: "agent",
  code: "agent.requestHumanHandoff",
  name: "requestHumanHandoff",
  description:
    "Escala la conversación actual a un agente humano cuando el cliente lo pide o las reglas lo requieren.",
  kind: "IA",
  dependencies: [{ code: "conversations.reply", type: "OBLIGATORIA" }],
});
