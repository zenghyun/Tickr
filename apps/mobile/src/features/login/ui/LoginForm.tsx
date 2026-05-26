// 이메일/비밀번호 로그인 폼 — RHF + zodResolver(loginBodySchema)
// .claude/rules/fsd-structure.md — features=동사 슬라이스
//
// 라우팅 호출 없음 — 라우팅 의존은 페이지/위젯에 둠. 회원가입 진입은 props로 위임:
//   - onSignupPress: 회원가입 화면 이동 (page에서 router.push 결정)
//   - onCancel: 인라인 모드에서 폼 닫기 (LoginFormShell 카드 토글)
//
// 더블 클릭 방지: isSubmitting OR isPending → Button loading + disabled.
// Supabase 에러 → mapAuthError로 KR 메시지 변환 후 인라인 배너 표시.
// 보안 메모: 로그인 실패는 mapAuthError가 "이메일 또는 비밀번호..." 통일 메시지로 변환.
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { KeyboardAvoidingView, Platform, Pressable, View } from "react-native";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginBodySchema, type LoginBody } from "@tickr/shared";

import { mapAuthError } from "@/shared/lib";
import { Button, Input, Text } from "@/shared/ui";

import { useLoginMutation } from "../api/login.mutation";

interface Props {
  onCancel?: () => void;
  onSignupPress?: () => void;
}

export const LoginForm = ({ onCancel, onSignupPress }: Props) => {
  const [formError, setFormError] = useState<string | null>(null);

  const { control, handleSubmit, formState } = useForm<LoginBody>({
    resolver: zodResolver(loginBodySchema),
    mode: "onBlur",
    defaultValues: { email: "", password: "" },
  });

  const mutation = useLoginMutation();

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      await mutation.mutateAsync(values);
      // 라우팅은 onAuthStateChange listener + (auth)/_layout 가드가 처리
    } catch (err) {
      setFormError(mapAuthError(err));
    }
  });

  const isBusy = formState.isSubmitting || mutation.isPending;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      className="gap-3"
    >
      {onCancel && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="로그인 폼 닫기"
          onPress={onCancel}
          hitSlop={8}
        >
          <Text variant="caption" tone="muted">
            ← 뒤로
          </Text>
        </Pressable>
      )}

      <Controller
        control={control}
        name="email"
        render={({ field, fieldState }) => (
          <Input
            label="이메일"
            placeholder="user@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            textContentType="emailAddress"
            returnKeyType="next"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={fieldState.error?.message}
            accessibilityLabel="이메일 주소 입력"
            editable={!isBusy}
          />
        )}
      />

      <Controller
        control={control}
        name="password"
        render={({ field, fieldState }) => (
          <Input
            label="비밀번호"
            placeholder="••••••"
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="current-password"
            textContentType="password"
            returnKeyType="done"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            onSubmitEditing={onSubmit}
            error={fieldState.error?.message}
            accessibilityLabel="비밀번호 입력"
            editable={!isBusy}
          />
        )}
      />

      {formError && (
        <View
          accessibilityLiveRegion="polite"
          className="rounded-lg bg-danger/10 px-3 py-2"
        >
          <Text variant="caption" tone="danger">
            {formError}
          </Text>
        </View>
      )}

      <Button
        label="로그인"
        variant="primary"
        size="md"
        fullWidth
        loading={isBusy}
        onPress={onSubmit}
        accessibilityLabel="로그인"
      />

      {onSignupPress && (
        <View className="mt-1 flex-row items-center justify-center gap-1">
          <Text variant="caption" tone="muted">
            계정이 없으신가요?
          </Text>
          <Pressable
            accessibilityRole="link"
            accessibilityLabel="회원가입 페이지로 이동"
            onPress={onSignupPress}
            hitSlop={8}
            disabled={isBusy}
          >
            <Text variant="caption" tone="primary" className="underline">
              회원가입하기
            </Text>
          </Pressable>
        </View>
      )}
    </KeyboardAvoidingView>
  );
};
