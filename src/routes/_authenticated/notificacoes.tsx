import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, Check, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  labelTipoNotificacao,
  listarNotificacoes,
  marcarTodasNotificacoesComoLidas,
  marcarNotificacaoComoLida,
  type Notificacao,
} from "@/lib/notificacoes";

export const Route = createFileRoute("/_authenticated/notificacoes")({
  head: () => ({ meta: [{ title: "Central de Notificações — SIGOV-SISPREV" }] }),
  component: Notificacoes,
});

function Notificacoes() {
  const queryClient = useQueryClient();

  const { data: notificacoes = [], isLoading } = useQuery({
    queryKey: ["notificacoes"],
    queryFn: () => listarNotificacoes(100),
    staleTime: 1000 * 60 * 5,
  });

  const markRead = useMutation({
    mutationFn: marcarNotificacaoComoLida,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["notificacoes"] });
      void queryClient.invalidateQueries({ queryKey: ["notificacoes-resumo"] });
    },
  });

  const markAllRead = useMutation({
    mutationFn: marcarTodasNotificacoesComoLidas,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["notificacoes"] });
      void queryClient.invalidateQueries({ queryKey: ["notificacoes-resumo"] });
    },
  });

  const unreadCount = notificacoes.filter((item) => !item.lida).length;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <Bell className="h-6 w-6 text-primary" />
            Central de Notificações
          </h1>
          <p className="text-sm text-muted-foreground">
            Alertas internos sobre prazos, evidências e acesso de usuários.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={unreadCount > 0 ? "default" : "secondary"} className="w-fit">
            {unreadCount} não lida{unreadCount === 1 ? "" : "s"}
          </Badge>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => markAllRead.mutate()}
            disabled={unreadCount === 0 || markAllRead.isPending}
          >
            <Check className="h-4 w-4" />
            Marcar todas como lidas
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-12">
          <Loader2 className="animate-spin text-primary" />
        </div>
      ) : notificacoes.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="font-medium">Nenhuma notificação encontrada.</p>
          <p className="mt-1 text-sm text-muted-foreground">Quando houver alertas, eles aparecerão aqui.</p>
        </Card>
      ) : (
        <Card className="divide-y overflow-hidden">
          {notificacoes.map((item) => (
            <NotificationRow
              key={item.id}
              item={item}
              onMarkRead={() => markRead.mutate(item.id)}
              disabled={markRead.isPending || markAllRead.isPending}
            />
          ))}
        </Card>
      )}
    </div>
  );
}

function NotificationRow({
  item,
  onMarkRead,
  disabled,
}: {
  item: Notificacao;
  onMarkRead: () => void;
  disabled: boolean;
}) {
  const content = (
    <div className="min-w-0 flex-1 space-y-1">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={item.lida ? "secondary" : "default"}>{labelTipoNotificacao(item.tipo)}</Badge>
        {!item.lida && <span className="h-2 w-2 rounded-full bg-primary" />}
        <span className="text-xs text-muted-foreground">{formatNotificationDate(item.created_at)}</span>
      </div>
      <p className="font-medium">{item.titulo}</p>
      {item.mensagem && <p className="text-sm text-muted-foreground">{item.mensagem}</p>}
    </div>
  );

  return (
    <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
      {item.acao_id ? (
        <Link
          to="/plano-acao/$id"
          params={{ id: item.acao_id }}
          className="min-w-0 flex-1 rounded-md outline-none transition hover:text-primary focus-visible:ring-2 focus-visible:ring-ring"
        >
          {content}
        </Link>
      ) : (
        content
      )}

      <div className="flex shrink-0 flex-wrap gap-2 sm:justify-end">
        {item.acao_id && (
          <Button asChild variant="outline" size="sm">
            <Link to="/plano-acao/$id" params={{ id: item.acao_id }}>
              Ver ação
            </Link>
          </Button>
        )}
        {!item.lida && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onMarkRead}
          disabled={disabled}
        >
          <Check className="h-4 w-4" />
          Marcar como lida
        </Button>
        )}
      </div>
    </div>
  );
}

function formatNotificationDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}
