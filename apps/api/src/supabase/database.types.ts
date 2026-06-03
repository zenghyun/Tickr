// Tickr DB 스키마 TypeScript 타입 (최소 정의).
//
// SupabaseClient<Database> generic에 주입되어 .from()/.rpc() 호출의
// args/return을 strict하게 추론하게 함.
//
// 운영 정책:
// - 새 테이블/RPC 추가 시 이 파일도 함께 갱신 (drift 시 typecheck 실패로 fail-fast)
// - 향후 `supabase gen types typescript --project-id` 자동 생성 도입 검토

export interface SymbolRow {
  symbol: string;
  name_ko: string | null;
  name_en: string | null;
  exchange: string;
  market: string;
  currency: string;
  is_active: boolean;
  listing_date: string | null;
  updated_at: string;
}

// search_symbols RPC가 반환하는 row (SymbolRow의 검색 필드 subset).
export interface SymbolSearchRpcRow {
  symbol: string;
  name_ko: string | null;
  name_en: string | null;
  exchange: string;
  market: string;
  currency: string;
}

export interface Database {
  public: {
    Tables: {
      symbols: {
        Row: SymbolRow;
        Insert: Omit<SymbolRow, 'updated_at'> & { updated_at?: string };
        Update: Partial<SymbolRow>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      search_symbols: {
        Args: {
          p_q: string;
          p_market: string | null;
          p_limit: number;
        };
        Returns: SymbolSearchRpcRow[];
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
