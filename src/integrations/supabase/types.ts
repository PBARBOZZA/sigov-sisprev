export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      acoes: {
        Row: {
          area_id: string | null;
          codigo: string;
          created_at: string;
          data_inicio: string | null;
          descricao: string | null;
          eixo_estrategico: string | null;
          eixo_id: string | null;
          id: string;
          objetivo: string | null;
          observacoes: string | null;
          percentual_execucao: number;
          periodicidade: string | null;
          plano_anual_id: string | null;
          prazo_final: string | null;
          prioridade: Database["public"]["Enums"]["acao_prioridade"];
          programa: string | null;
          programa_id: string | null;
          projeto: string | null;
          responsavel_id: string | null;
          responsavel_nome: string | null;
          status: Database["public"]["Enums"]["acao_status"];
          titulo: string;
          updated_at: string;
        };
        Insert: {
          area_id?: string | null;
          codigo: string;
          created_at?: string;
          data_inicio?: string | null;
          descricao?: string | null;
          eixo_estrategico?: string | null;
          eixo_id?: string | null;
          id?: string;
          objetivo?: string | null;
          observacoes?: string | null;
          percentual_execucao?: number;
          periodicidade?: string | null;
          plano_anual_id?: string | null;
          prazo_final?: string | null;
          prioridade?: Database["public"]["Enums"]["acao_prioridade"];
          programa?: string | null;
          programa_id?: string | null;
          projeto?: string | null;
          responsavel_id?: string | null;
          responsavel_nome?: string | null;
          status?: Database["public"]["Enums"]["acao_status"];
          titulo: string;
          updated_at?: string;
        };
        Update: {
          area_id?: string | null;
          codigo?: string;
          created_at?: string;
          data_inicio?: string | null;
          descricao?: string | null;
          eixo_estrategico?: string | null;
          eixo_id?: string | null;
          id?: string;
          objetivo?: string | null;
          observacoes?: string | null;
          percentual_execucao?: number;
          periodicidade?: string | null;
          plano_anual_id?: string | null;
          prazo_final?: string | null;
          prioridade?: Database["public"]["Enums"]["acao_prioridade"];
          programa?: string | null;
          programa_id?: string | null;
          projeto?: string | null;
          responsavel_id?: string | null;
          responsavel_nome?: string | null;
          status?: Database["public"]["Enums"]["acao_status"];
          titulo?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "acoes_area_id_fkey";
            columns: ["area_id"];
            isOneToOne: false;
            referencedRelation: "areas";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "acoes_eixo_id_fkey";
            columns: ["eixo_id"];
            isOneToOne: false;
            referencedRelation: "pga_eixos";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "acoes_plano_anual_id_fkey";
            columns: ["plano_anual_id"];
            isOneToOne: false;
            referencedRelation: "plano_anual";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "acoes_programa_id_fkey";
            columns: ["programa_id"];
            isOneToOne: false;
            referencedRelation: "pga_programas";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "acoes_responsavel_id_fkey";
            columns: ["responsavel_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      acoes_apoiadores: {
        Row: {
          acao_id: string;
          id: string;
          usuario_id: string;
        };
        Insert: {
          acao_id: string;
          id?: string;
          usuario_id: string;
        };
        Update: {
          acao_id?: string;
          id?: string;
          usuario_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "acoes_apoiadores_acao_id_fkey";
            columns: ["acao_id"];
            isOneToOne: false;
            referencedRelation: "acoes";
            referencedColumns: ["id"];
          },
        ];
      };
      areas: {
        Row: {
          created_at: string;
          descricao: string | null;
          id: string;
          nome: string;
          responsavel_id: string | null;
          status: boolean;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          descricao?: string | null;
          id?: string;
          nome: string;
          responsavel_id?: string | null;
          status?: boolean;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          descricao?: string | null;
          id?: string;
          nome?: string;
          responsavel_id?: string | null;
          status?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };
      evidencias: {
        Row: {
          acao_id: string;
          caminho_arquivo: string;
          created_at: string;
          id: string;
          nome_arquivo: string;
          observacao: string | null;
          tipo_arquivo: string | null;
          usuario_id: string;
        };
        Insert: {
          acao_id: string;
          caminho_arquivo: string;
          created_at?: string;
          id?: string;
          nome_arquivo: string;
          observacao?: string | null;
          tipo_arquivo?: string | null;
          usuario_id: string;
        };
        Update: {
          acao_id?: string;
          caminho_arquivo?: string;
          created_at?: string;
          id?: string;
          nome_arquivo?: string;
          observacao?: string | null;
          tipo_arquivo?: string | null;
          usuario_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "evidencias_acao_id_fkey";
            columns: ["acao_id"];
            isOneToOne: false;
            referencedRelation: "acoes";
            referencedColumns: ["id"];
          },
        ];
      };
      historico_acoes: {
        Row: {
          acao_id: string;
          campo_alterado: string;
          created_at: string;
          id: string;
          usuario_id: string | null;
          valor_anterior: string | null;
          valor_novo: string | null;
        };
        Insert: {
          acao_id: string;
          campo_alterado: string;
          created_at?: string;
          id?: string;
          usuario_id?: string | null;
          valor_anterior?: string | null;
          valor_novo?: string | null;
        };
        Update: {
          acao_id?: string;
          campo_alterado?: string;
          created_at?: string;
          id?: string;
          usuario_id?: string | null;
          valor_anterior?: string | null;
          valor_novo?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "historico_acoes_acao_id_fkey";
            columns: ["acao_id"];
            isOneToOne: false;
            referencedRelation: "acoes";
            referencedColumns: ["id"];
          },
        ];
      };
      historico_alertas: {
        Row: {
          data_envio: string;
          email: string | null;
          id: string;
          referencia_id: string;
          referencia_tipo: string;
          status_envio: string | null;
          tipo_alerta: string;
          usuario_id: string | null;
        };
        Insert: {
          data_envio?: string;
          email?: string | null;
          id?: string;
          referencia_id: string;
          referencia_tipo: string;
          status_envio?: string | null;
          tipo_alerta: string;
          usuario_id?: string | null;
        };
        Update: {
          data_envio?: string;
          email?: string | null;
          id?: string;
          referencia_id?: string;
          referencia_tipo?: string;
          status_envio?: string | null;
          tipo_alerta?: string;
          usuario_id?: string | null;
        };
        Relationships: [];
      };
      indicadores: {
        Row: {
          area_id: string | null;
          created_at: string;
          descricao: string | null;
          formula: string | null;
          id: string;
          meta: number | null;
          nome: string;
          periodicidade: string | null;
          responsavel_id: string | null;
          resultado_atual: number | null;
          status: boolean;
          unidade_medida: string | null;
          updated_at: string;
        };
        Insert: {
          area_id?: string | null;
          created_at?: string;
          descricao?: string | null;
          formula?: string | null;
          id?: string;
          meta?: number | null;
          nome: string;
          periodicidade?: string | null;
          responsavel_id?: string | null;
          resultado_atual?: number | null;
          status?: boolean;
          unidade_medida?: string | null;
          updated_at?: string;
        };
        Update: {
          area_id?: string | null;
          created_at?: string;
          descricao?: string | null;
          formula?: string | null;
          id?: string;
          meta?: number | null;
          nome?: string;
          periodicidade?: string | null;
          responsavel_id?: string | null;
          resultado_atual?: number | null;
          status?: boolean;
          unidade_medida?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "indicadores_area_id_fkey";
            columns: ["area_id"];
            isOneToOne: false;
            referencedRelation: "areas";
            referencedColumns: ["id"];
          },
        ];
      };
      notificacoes: {
        Row: {
          created_at: string;
          id: string;
          lida: boolean;
          mensagem: string | null;
          referencia_id: string | null;
          referencia_tipo: string | null;
          tipo: string;
          titulo: string;
          usuario_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          lida?: boolean;
          mensagem?: string | null;
          referencia_id?: string | null;
          referencia_tipo?: string | null;
          tipo: string;
          titulo: string;
          usuario_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          lida?: boolean;
          mensagem?: string | null;
          referencia_id?: string | null;
          referencia_tipo?: string | null;
          tipo?: string;
          titulo?: string;
          usuario_id?: string;
        };
        Relationships: [];
      };
      pga_eixos: {
        Row: {
          codigo: string;
          created_at: string;
          descricao: string | null;
          id: string;
          nome: string;
          ordem: number | null;
          plano_anual_id: string;
          responsavel_id: string | null;
          status: boolean;
          updated_at: string;
        };
        Insert: {
          codigo: string;
          created_at?: string;
          descricao?: string | null;
          id?: string;
          nome: string;
          ordem?: number | null;
          plano_anual_id: string;
          responsavel_id?: string | null;
          status?: boolean;
          updated_at?: string;
        };
        Update: {
          codigo?: string;
          created_at?: string;
          descricao?: string | null;
          id?: string;
          nome?: string;
          ordem?: number | null;
          plano_anual_id?: string;
          responsavel_id?: string | null;
          status?: boolean;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "pga_eixos_plano_anual_id_fkey";
            columns: ["plano_anual_id"];
            isOneToOne: false;
            referencedRelation: "plano_anual";
            referencedColumns: ["id"];
          },
        ];
      };
      pga_programas: {
        Row: {
          area_responsavel_id: string | null;
          codigo: string;
          created_at: string;
          descricao: string | null;
          eixo_id: string;
          id: string;
          nome: string;
          objetivo: string | null;
          ordem: number | null;
          plano_anual_id: string;
          responsavel_id: string | null;
          status: boolean;
          updated_at: string;
        };
        Insert: {
          area_responsavel_id?: string | null;
          codigo: string;
          created_at?: string;
          descricao?: string | null;
          eixo_id: string;
          id?: string;
          nome: string;
          objetivo?: string | null;
          ordem?: number | null;
          plano_anual_id: string;
          responsavel_id?: string | null;
          status?: boolean;
          updated_at?: string;
        };
        Update: {
          area_responsavel_id?: string | null;
          codigo?: string;
          created_at?: string;
          descricao?: string | null;
          eixo_id?: string;
          id?: string;
          nome?: string;
          objetivo?: string | null;
          ordem?: number | null;
          plano_anual_id?: string;
          responsavel_id?: string | null;
          status?: boolean;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "pga_programas_area_responsavel_id_fkey";
            columns: ["area_responsavel_id"];
            isOneToOne: false;
            referencedRelation: "areas";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "pga_programas_eixo_id_fkey";
            columns: ["eixo_id"];
            isOneToOne: false;
            referencedRelation: "pga_eixos";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "pga_programas_plano_anual_id_fkey";
            columns: ["plano_anual_id"];
            isOneToOne: false;
            referencedRelation: "plano_anual";
            referencedColumns: ["id"];
          },
        ];
      };
      plano_anual: {
        Row: {
          ano: number;
          created_at: string;
          data_aprovacao: string | null;
          data_fim: string | null;
          data_inicio: string | null;
          descricao: string | null;
          id: string;
          nome: string;
          observacoes: string | null;
          responsavel_id: string | null;
          status: string;
          updated_at: string;
          versao: string;
        };
        Insert: {
          ano: number;
          created_at?: string;
          data_aprovacao?: string | null;
          data_fim?: string | null;
          data_inicio?: string | null;
          descricao?: string | null;
          id?: string;
          nome: string;
          observacoes?: string | null;
          responsavel_id?: string | null;
          status?: string;
          updated_at?: string;
          versao?: string;
        };
        Update: {
          ano?: number;
          created_at?: string;
          data_aprovacao?: string | null;
          data_fim?: string | null;
          data_inicio?: string | null;
          descricao?: string | null;
          id?: string;
          nome?: string;
          observacoes?: string | null;
          responsavel_id?: string | null;
          status?: string;
          updated_at?: string;
          versao?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          area_id: string | null;
          cargo: string | null;
          created_at: string;
          email: string;
          id: string;
          nome: string;
          status: boolean;
          updated_at: string;
        };
        Insert: {
          area_id?: string | null;
          cargo?: string | null;
          created_at?: string;
          email: string;
          id: string;
          nome: string;
          status?: boolean;
          updated_at?: string;
        };
        Update: {
          area_id?: string | null;
          cargo?: string | null;
          created_at?: string;
          email?: string;
          id?: string;
          nome?: string;
          status?: boolean;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_area_id_fkey";
            columns: ["area_id"];
            isOneToOne: false;
            referencedRelation: "areas";
            referencedColumns: ["id"];
          },
        ];
      };
      requisitos_progestao: {
        Row: {
          created_at: string;
          descricao: string | null;
          dimensao: string | null;
          evidencia: string | null;
          id: string;
          item: string;
          observacoes: string | null;
          prazo: string | null;
          responsavel_id: string | null;
          situacao: Database["public"]["Enums"]["progestao_situacao"];
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          descricao?: string | null;
          dimensao?: string | null;
          evidencia?: string | null;
          id?: string;
          item: string;
          observacoes?: string | null;
          prazo?: string | null;
          responsavel_id?: string | null;
          situacao?: Database["public"]["Enums"]["progestao_situacao"];
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          descricao?: string | null;
          dimensao?: string | null;
          evidencia?: string | null;
          id?: string;
          item?: string;
          observacoes?: string | null;
          prazo?: string | null;
          responsavel_id?: string | null;
          situacao?: Database["public"]["Enums"]["progestao_situacao"];
          updated_at?: string;
        };
        Relationships: [];
      };
      user_roles: {
        Row: {
          created_at: string;
          id: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          role?: Database["public"]["Enums"]["app_role"];
          user_id?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"];
          _user_id: string;
        };
        Returns: boolean;
      };
      is_active_user: { Args: { _user_id: string }; Returns: boolean };
      is_admin_or_diretoria: { Args: { _user_id: string }; Returns: boolean };
    };
    Enums: {
      acao_prioridade: "baixa" | "media" | "alta" | "critica";
      acao_status: "nao_iniciada" | "em_andamento" | "concluida" | "atrasada" | "cancelada";
      app_role: "admin" | "diretoria" | "responsavel" | "apoiador" | "consulta" | "conselheiro";
      progestao_situacao: "atendido" | "parcial" | "nao_atendido" | "em_implantacao";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      acao_prioridade: ["baixa", "media", "alta", "critica"],
      acao_status: ["nao_iniciada", "em_andamento", "concluida", "atrasada", "cancelada"],
      app_role: ["admin", "diretoria", "responsavel", "apoiador", "consulta", "conselheiro"],
      progestao_situacao: ["atendido", "parcial", "nao_atendido", "em_implantacao"],
    },
  },
} as const;
