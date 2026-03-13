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
      municipios_financeiro: {
        Row: {
          aplicacao_70_fundeb: number | null
          aplicacao_educacao: number | null
          aplicacao_saude: number | null
          caixa: number | null
          consignacoes_tesouraria: number | null
          created_at: string
          credito_utilizado_anulacao: number | null
          credito_utilizado_excesso: number | null
          credito_utilizado_superavit: number | null
          despesa_empenhada_fonte1: number | null
          despesa_empenhada_fonte2: number | null
          despesa_fixada: number | null
          despesa_liquidada: number | null
          despesa_nao_processada: number | null
          despesa_paga: number | null
          despesa_processada: number | null
          gasto_pessoal: number | null
          ibge: string | null
          id: string
          indice_educacao: number | null
          indice_fundeb: number | null
          indice_pessoal: number | null
          indice_saude: number | null
          mes_referencia: string
          municipio: string
          perc_suplementacao_anulacao: number | null
          perc_suplementacao_excesso: number | null
          perc_suplementacao_superavit: number | null
          receita_corrente_liquida: number | null
          receita_fundeb: number | null
          receita_prevista_ano: number | null
          receita_prevista_mes: number | null
          receita_realizada: number | null
          res_financeiro_empenhado: number | null
          res_financeiro_liquidado: number | null
          resto_nao_processado: number | null
          resto_processado: number | null
          superavit_apurado_anterior: number | null
          suplementacao_autorizada_anulacao: number | null
          suplementacao_autorizada_superavit: number | null
          updated_at: string
          valor_excesso_projetado: number | null
        }
        Insert: {
          aplicacao_70_fundeb?: number | null
          aplicacao_educacao?: number | null
          aplicacao_saude?: number | null
          caixa?: number | null
          consignacoes_tesouraria?: number | null
          created_at?: string
          credito_utilizado_anulacao?: number | null
          credito_utilizado_excesso?: number | null
          credito_utilizado_superavit?: number | null
          despesa_empenhada_fonte1?: number | null
          despesa_empenhada_fonte2?: number | null
          despesa_fixada?: number | null
          despesa_liquidada?: number | null
          despesa_nao_processada?: number | null
          despesa_paga?: number | null
          despesa_processada?: number | null
          gasto_pessoal?: number | null
          ibge?: string | null
          id?: string
          indice_educacao?: number | null
          indice_fundeb?: number | null
          indice_pessoal?: number | null
          indice_saude?: number | null
          mes_referencia: string
          municipio: string
          perc_suplementacao_anulacao?: number | null
          perc_suplementacao_excesso?: number | null
          perc_suplementacao_superavit?: number | null
          receita_corrente_liquida?: number | null
          receita_fundeb?: number | null
          receita_prevista_ano?: number | null
          receita_prevista_mes?: number | null
          receita_realizada?: number | null
          res_financeiro_empenhado?: number | null
          res_financeiro_liquidado?: number | null
          resto_nao_processado?: number | null
          resto_processado?: number | null
          superavit_apurado_anterior?: number | null
          suplementacao_autorizada_anulacao?: number | null
          suplementacao_autorizada_superavit?: number | null
          updated_at?: string
          valor_excesso_projetado?: number | null
        }
        Update: {
          aplicacao_70_fundeb?: number | null
          aplicacao_educacao?: number | null
          aplicacao_saude?: number | null
          caixa?: number | null
          consignacoes_tesouraria?: number | null
          created_at?: string
          credito_utilizado_anulacao?: number | null
          credito_utilizado_excesso?: number | null
          credito_utilizado_superavit?: number | null
          despesa_empenhada_fonte1?: number | null
          despesa_empenhada_fonte2?: number | null
          despesa_fixada?: number | null
          despesa_liquidada?: number | null
          despesa_nao_processada?: number | null
          despesa_paga?: number | null
          despesa_processada?: number | null
          gasto_pessoal?: number | null
          ibge?: string | null
          id?: string
          indice_educacao?: number | null
          indice_fundeb?: number | null
          indice_pessoal?: number | null
          indice_saude?: number | null
          mes_referencia?: string
          municipio?: string
          perc_suplementacao_anulacao?: number | null
          perc_suplementacao_excesso?: number | null
          perc_suplementacao_superavit?: number | null
          receita_corrente_liquida?: number | null
          receita_fundeb?: number | null
          receita_prevista_ano?: number | null
          receita_prevista_mes?: number | null
          receita_realizada?: number | null
          res_financeiro_empenhado?: number | null
          res_financeiro_liquidado?: number | null
          resto_nao_processado?: number | null
          resto_processado?: number | null
          superavit_apurado_anterior?: number | null
          suplementacao_autorizada_anulacao?: number | null
          suplementacao_autorizada_superavit?: number | null
          updated_at?: string
          valor_excesso_projetado?: number | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
