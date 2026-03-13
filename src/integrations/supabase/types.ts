export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      audit_log: {
        Row: {
          acao: string
          cliente_id: string | null
          criado_em: string | null
          detalhes: Json | null
          id: string
          usuario_id: string | null
        }
        Insert: {
          acao: string
          cliente_id?: string | null
          criado_em?: string | null
          detalhes?: Json | null
          id?: string
          usuario_id?: string | null
        }
        Update: {
          acao?: string
          cliente_id?: string | null
          criado_em?: string | null
          detalhes?: Json | null
          id?: string
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_log_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      clientes: {
        Row: {
          atualizado_em: string | null
          criado_em: string | null
          criado_por: string | null
          id: string
          link_sistema: string | null
          login_sistema: string | null
          municipio_id: number
          senha_sistema: string | null
          status: boolean | null
          tipos_servico: Database["public"]["Enums"]["tipo_servico"][]
        }
        Insert: {
          atualizado_em?: string | null
          criado_em?: string | null
          criado_por?: string | null
          id?: string
          link_sistema?: string | null
          login_sistema?: string | null
          municipio_id: number
          senha_sistema?: string | null
          status?: boolean | null
          tipos_servico?: Database["public"]["Enums"]["tipo_servico"][]
        }
        Update: {
          atualizado_em?: string | null
          criado_em?: string | null
          criado_por?: string | null
          id?: string
          link_sistema?: string | null
          login_sistema?: string | null
          municipio_id?: number
          senha_sistema?: string | null
          status?: boolean | null
          tipos_servico?: Database["public"]["Enums"]["tipo_servico"][]
        }
        Relationships: [
          {
            foreignKeyName: "clientes_criado_por_fkey"
            columns: ["criado_por"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clientes_municipio_id_fkey"
            columns: ["municipio_id"]
            isOneToOne: true
            referencedRelation: "municipios"
            referencedColumns: ["id"]
          },
        ]
      }
      modulos: {
        Row: {
          chave: string
          descricao: string | null
          id: number
          nome: string
          ordem: number | null
        }
        Insert: {
          chave: string
          descricao?: string | null
          id?: number
          nome: string
          ordem?: number | null
        }
        Update: {
          chave?: string
          descricao?: string | null
          id?: number
          nome?: string
          ordem?: number | null
        }
        Relationships: []
      }
      municipios: {
        Row: {
          capital: boolean
          codigo_ibge: number
          codigo_uf: number
          ddd: number | null
          fuso_horario: string | null
          id: number
          latitude: number | null
          longitude: number | null
          nome: string
          siafi_id: number | null
        }
        Insert: {
          capital?: boolean
          codigo_ibge: number
          codigo_uf: number
          ddd?: number | null
          fuso_horario?: string | null
          id: number
          latitude?: number | null
          longitude?: number | null
          nome: string
          siafi_id?: number | null
        }
        Update: {
          capital?: boolean
          codigo_ibge?: number
          codigo_uf?: number
          ddd?: number | null
          fuso_horario?: string | null
          id?: number
          latitude?: number | null
          longitude?: number | null
          nome?: string
          siafi_id?: number | null
        }
        Relationships: []
      }
      permissoes_perfil: {
        Row: {
          id: number
          modulo_id: number
          perfil: Database["public"]["Enums"]["tipo_perfil"]
          pode_criar: boolean | null
          pode_editar: boolean | null
          pode_excluir: boolean | null
          pode_ver: boolean | null
        }
        Insert: {
          id?: number
          modulo_id: number
          perfil: Database["public"]["Enums"]["tipo_perfil"]
          pode_criar?: boolean | null
          pode_editar?: boolean | null
          pode_excluir?: boolean | null
          pode_ver?: boolean | null
        }
        Update: {
          id?: number
          modulo_id?: number
          perfil?: Database["public"]["Enums"]["tipo_perfil"]
          pode_criar?: boolean | null
          pode_editar?: boolean | null
          pode_excluir?: boolean | null
          pode_ver?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "permissoes_perfil_modulo_id_fkey"
            columns: ["modulo_id"]
            isOneToOne: false
            referencedRelation: "modulos"
            referencedColumns: ["id"]
          },
        ]
      }
      permissoes_usuario: {
        Row: {
          id: number
          modulo_id: number
          pode_criar: boolean | null
          pode_editar: boolean | null
          pode_excluir: boolean | null
          pode_ver: boolean | null
          usuario_id: string
        }
        Insert: {
          id?: number
          modulo_id: number
          pode_criar?: boolean | null
          pode_editar?: boolean | null
          pode_excluir?: boolean | null
          pode_ver?: boolean | null
          usuario_id: string
        }
        Update: {
          id?: number
          modulo_id?: number
          pode_criar?: boolean | null
          pode_editar?: boolean | null
          pode_excluir?: boolean | null
          pode_ver?: boolean | null
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "permissoes_usuario_modulo_id_fkey"
            columns: ["modulo_id"]
            isOneToOne: false
            referencedRelation: "modulos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "permissoes_usuario_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      tcmgo_municipios: {
        Row: {
          atualizado_em: string | null
          cnpj: string | null
          descricao: string
          id: number
          importado_em: string | null
          regiao: string | null
        }
        Insert: {
          atualizado_em?: string | null
          cnpj?: string | null
          descricao: string
          id: number
          importado_em?: string | null
          regiao?: string | null
        }
        Update: {
          atualizado_em?: string | null
          cnpj?: string | null
          descricao?: string
          id?: number
          importado_em?: string | null
          regiao?: string | null
        }
        Relationships: []
      }
      tcmgo_orgaos: {
        Row: {
          ativo: boolean | null
          atualizado_em: string | null
          codigo_orgao: string
          descricao_orgao: string
          id: number
          importado_em: string | null
          municipio_tcmgo_id: number
          tipo_orgao: string | null
        }
        Insert: {
          ativo?: boolean | null
          atualizado_em?: string | null
          codigo_orgao: string
          descricao_orgao: string
          id?: number
          importado_em?: string | null
          municipio_tcmgo_id: number
          tipo_orgao?: string | null
        }
        Update: {
          ativo?: boolean | null
          atualizado_em?: string | null
          codigo_orgao?: string
          descricao_orgao?: string
          id?: number
          importado_em?: string | null
          municipio_tcmgo_id?: number
          tipo_orgao?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tcmgo_orgaos_municipio_tcmgo_id_fkey"
            columns: ["municipio_tcmgo_id"]
            isOneToOne: false
            referencedRelation: "tcmgo_municipios"
            referencedColumns: ["id"]
          },
        ]
      }
      tcmgo_sync_log: {
        Row: {
          finalizado_em: string | null
          id: string
          iniciado_em: string | null
          mensagem_erro: string | null
          status: string
          tipo: string | null
          total_registros: number | null
          usuario_id: string | null
        }
        Insert: {
          finalizado_em?: string | null
          id?: string
          iniciado_em?: string | null
          mensagem_erro?: string | null
          status?: string
          tipo?: string | null
          total_registros?: number | null
          usuario_id?: string | null
        }
        Update: {
          finalizado_em?: string | null
          id?: string
          iniciado_em?: string | null
          mensagem_erro?: string | null
          status?: string
          tipo?: string | null
          total_registros?: number | null
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tcmgo_sync_log_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      usuario_municipios: {
        Row: {
          id: number
          municipio_id: number
          usuario_id: string
        }
        Insert: {
          id?: number
          municipio_id: number
          usuario_id: string
        }
        Update: {
          id?: number
          municipio_id?: number
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "usuario_municipios_municipio_id_fkey"
            columns: ["municipio_id"]
            isOneToOne: false
            referencedRelation: "municipios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "usuario_municipios_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      usuarios: {
        Row: {
          ativo: boolean | null
          atualizado_em: string | null
          auth_id: string | null
          criado_em: string | null
          email: string
          foto_url: string | null
          id: string
          municipio_id: number
          nome: string
          perfil: Database["public"]["Enums"]["tipo_perfil"]
          telefone: string | null
          username: string
        }
        Insert: {
          ativo?: boolean | null
          atualizado_em?: string | null
          auth_id?: string | null
          criado_em?: string | null
          email: string
          foto_url?: string | null
          id?: string
          municipio_id: number
          nome: string
          perfil: Database["public"]["Enums"]["tipo_perfil"]
          telefone?: string | null
          username: string
        }
        Update: {
          ativo?: boolean | null
          atualizado_em?: string | null
          auth_id?: string | null
          criado_em?: string | null
          email?: string
          foto_url?: string | null
          id?: string
          municipio_id?: number
          nome?: string
          perfil?: Database["public"]["Enums"]["tipo_perfil"]
          telefone?: string | null
          username?: string
        }
        Relationships: [
          {
            foreignKeyName: "usuarios_municipio_id_fkey"
            columns: ["municipio_id"]
            isOneToOne: false
            referencedRelation: "municipios"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      copiar_permissoes_perfil: {
        Args: {
          p_perfil: Database["public"]["Enums"]["tipo_perfil"]
          p_usuario_id: string
        }
        Returns: undefined
      }
    }
    Enums: {
      tipo_perfil:
        | "Administrador"
        | "Auxiliar"
        | "Comercial"
        | "Coordenador"
        | "Juridico"
        | "Suporte"
      tipo_servico: "Contábil" | "Jurídico" | "Auditoria" | "Compliance"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      tipo_perfil: [
        "Administrador",
        "Auxiliar",
        "Comercial",
        "Coordenador",
        "Juridico",
        "Suporte",
      ],
      tipo_servico: ["Contábil", "Jurídico", "Auditoria", "Compliance"],
    },
  },
} as const
