// 설정 페이지 placeholder — Stack 푸시 화면 (뒤로가기 자동)
// 실제 설정 항목 정식 작업에서 features/* 추가 시 본 컴포넌트가 호스트.
//
// 임시 로그아웃 버튼:
//   - #7 검증(V8 시나리오 — 세션 cascade) 위한 임시 노출.
//   - useLogoutMutation → onAuthStateChange('SIGNED_OUT') → listener가 cache clear + tokenStorage 초기화
//     → (tabs)/_layout 가드가 (auth)/login으로 자동 cascade redirect.
//   - 정식 설정 화면(별도 이슈)에서 메뉴 형태로 통합 예정.
import { Alert, View } from "react-native";

import { useLogoutMutation } from "@/features/logout";
import { mapAuthError } from "@/shared/lib";
import { Button, Screen, Text } from "@/shared/ui";

export const SettingsPage = () => {
  const logout = useLogoutMutation();

  const onLogoutPress = () => {
    Alert.alert("로그아웃", "정말 로그아웃하시겠어요?", [
      { text: "취소", style: "cancel" },
      {
        text: "로그아웃",
        style: "destructive",
        onPress: () => {
          logout.mutate(undefined, {
            onError: (err) => {
              Alert.alert("로그아웃 실패", mapAuthError(err));
            },
            // 성공 처리는 listener + 가드가 cascade로 수행 — 본 컴포넌트에서는 없음
          });
        },
      },
    ]);
  };

  return (
    <Screen>
      <View className="flex-1 items-stretch justify-start gap-6 p-4">
        <View>
          <Text variant="body" tone="muted">
            설정
          </Text>
          <Text variant="caption" tone="muted" className="mt-2">
            계정·테마 항목이 들어올 자리
          </Text>
        </View>

        <View>
          <Button
            label="로그아웃"
            variant="danger"
            size="md"
            fullWidth
            loading={logout.isPending}
            onPress={onLogoutPress}
            accessibilityLabel="로그아웃"
          />
          <Text
            variant="caption"
            tone="muted"
            className="mt-2 text-center"
          >
            #7 검증용 임시 버튼 — 정식 설정 화면에서 메뉴로 통합
          </Text>
        </View>
      </View>
    </Screen>
  );
};
