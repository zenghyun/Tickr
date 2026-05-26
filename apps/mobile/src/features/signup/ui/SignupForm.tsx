// 이메일/비밀번호 회원가입 폼 — RHF + zodResolver(signupBodySchema)
// .claude/rules/fsd-structure.md — features=동사 슬라이스
//
// 닉네임/핸드폰은 본 단계 미수집:
//   - 닉네임: handle_new_user 트리거 자동 생성, W8 온보딩에서 변경
//   - 핸드폰: 별도 이슈 #43 (SMS OTP 가입 게이트)
//
// 면책 문구: TestFlight 심사 요건 — 가입 전 노출 보장 위해 카드 내부 하단에 배치.
// kr-finance.md: "교육·학습 목적의 모의투자입니다. 투자 권유 아님."
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { KeyboardAvoidingView, Platform, Pressable, View } from "react-native";
import { zodResolver } from "@hookform/resolvers/zod";
import { signupBodySchema, type SignupBody } from "@tickr/shared";

import { mapAuthError } from "@/shared/lib";
import { Button, Input, Text } from "@/shared/ui";

import { useSignupMutation } from "../api/signup.mutation";

interface Props {
  onCancel?: () => void;
  onLoginPress?: () => void;
}

export const SignupForm = ({ onCancel, onLoginPress }: Props) => {
  const [formError, setFormError] = useState<string | null>(null);

  const { control, handleSubmit, formState } = useForm<SignupBody>({
    resolver: zodResolver(signupBodySchema),
    mode: "onBlur",
    defaultValues: { email: "", password: "", passwordConfirm: "" },
  });

  const mutation = useSignupMutation();

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      await mutation.mutateAsync(values);
      // 라우팅은 onAuthStateChange listener + 가드가 처리
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
          accessibilityLabel="회원가입 폼 닫기"
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
            placeholder="8자 이상 / 영문·숫자·특수문자"
            helper={
              fieldState.error?.message
                ? undefined
                : '8자 이상 + 영문 + 숫자 + 특수문자(!@#$ 등) 각 1개 이상'
            }
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="new-password"
            textContentType="newPassword"
            returnKeyType="next"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={fieldState.error?.message}
            accessibilityLabel="비밀번호 입력"
            editable={!isBusy}
          />
        )}
      />

      <Controller
        control={control}
        name="passwordConfirm"
        render={({ field, fieldState }) => (
          <Input
            label="비밀번호 확인"
            placeholder="비밀번호 재입력"
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="new-password"
            textContentType="newPassword"
            returnKeyType="done"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            onSubmitEditing={onSubmit}
            error={fieldState.error?.message}
            accessibilityLabel="비밀번호 확인 입력"
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
        label="시작하기"
        variant="primary"
        size="md"
        fullWidth
        loading={isBusy}
        onPress={onSubmit}
        accessibilityLabel="회원가입"
      />

      {onLoginPress && (
        <View className="mt-1 flex-row items-center justify-center gap-1">
          <Text variant="caption" tone="muted">
            이미 계정이 있으신가요?
          </Text>
          <Pressable
            accessibilityRole="link"
            accessibilityLabel="로그인 페이지로 이동"
            onPress={onLoginPress}
            hitSlop={8}
            disabled={isBusy}
          >
            <Text variant="caption" tone="primary" className="underline">
              로그인하기
            </Text>
          </Pressable>
        </View>
      )}

      <View className="mt-2 items-center">
        <Text
          variant="caption"
          tone="muted"
          className="text-center"
        >{`교육·학습 목적의 모의투자입니다.\n실제 투자 권유가 아닙니다.`}</Text>
      </View>
    </KeyboardAvoidingView>
  );
};
