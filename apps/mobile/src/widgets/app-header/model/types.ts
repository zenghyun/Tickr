// AppHeader 공용 타입
// 1단계는 'sparkles'(AI) 미노출 — icon union에서 제외
// 추가 아이콘은 디자인 합의 후 union 확장
export type AppHeaderIcon = 'search' | 'menu';

export interface AppHeaderAction {
  icon: AppHeaderIcon;
  accessibilityLabel: string;
  onPress: () => void;
}

export interface AppHeaderProps {
  /**
   * 헤더 좌측 타이틀. (tabs)/_layout 의 screenOptions.header 콜백에서 라우트별로 주입.
   */
  title: string;
  /**
   * 우측 액션 (최대 3개 권장). 1단계는 검색 + 설정 2개.
   */
  actions?: readonly AppHeaderAction[];
}
