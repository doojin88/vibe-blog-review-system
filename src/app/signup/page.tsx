"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client";
import { useCurrentUser } from "@/features/auth/hooks/useCurrentUser";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

const SignupStep1Schema = z
  .object({
    email: z.string().email("올바른 이메일 형식을 입력해주세요"),
    password: z
      .string()
      .min(8, "비밀번호는 최소 8자 이상이어야 합니다"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "비밀번호가 일치하지 않습니다",
    path: ["confirmPassword"],
  });

type SignupStep1Data = z.infer<typeof SignupStep1Schema>;

type SignupStep = "credentials" | "role";

type SignupPageProps = {
  params: Promise<Record<string, never>>;
};

export default function SignupPage({ params }: SignupPageProps) {
  void params;

  const router = useRouter();
  const { isAuthenticated, refresh } = useCurrentUser();
  const supabase = getSupabaseBrowserClient();

  const [currentStep, setCurrentStep] = useState<SignupStep>("credentials");
  const [credentials, setCredentials] = useState<SignupStep1Data | null>(null);
  const [selectedRole, setSelectedRole] = useState<
    "advertiser" | "influencer" | null
  >(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const form = useForm<SignupStep1Data>({
    resolver: zodResolver(SignupStep1Schema),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  useEffect(() => {
    if (isAuthenticated) {
      router.replace("/");
    }
  }, [isAuthenticated, router]);

  const handleCredentialsSubmit = async (data: SignupStep1Data) => {
    setIsSubmitting(true);
    setErrorMessage(null);

    const result = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
    });

    if (result.error) {
      setErrorMessage(result.error.message ?? "회원가입에 실패했습니다.");
      setIsSubmitting(false);
      return;
    }

    await refresh();
    setCredentials(data);
    setCurrentStep("role");
    setIsSubmitting(false);
  };

  const handleRoleSubmit = () => {
    if (selectedRole === "advertiser") {
      router.push("/onboarding/advertiser");
    } else if (selectedRole === "influencer") {
      router.push("/onboarding/influencer");
    }
  };

  const handleBackToCredentials = () => {
    setCurrentStep("credentials");
    setSelectedRole(null);
    setErrorMessage(null);
  };

  if (isAuthenticated) {
    return null;
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col items-center justify-center gap-10 px-6 py-16">
      <header className="flex flex-col items-center gap-3 text-center">
        <h1 className="text-3xl font-semibold">회원가입</h1>
        <p className="text-slate-500">
          {currentStep === "credentials"
            ? "이메일과 비밀번호를 입력해주세요"
            : "사용하실 서비스를 선택해주세요"}
        </p>
      </header>

      <div className="grid w-full gap-8 md:grid-cols-2">
        {/* Step 1: 이메일/비밀번호 */}
        {currentStep === "credentials" && (
          <div className="flex flex-col gap-4">
            <Card>
              <CardHeader>
                <CardTitle>회원가입</CardTitle>
                <CardDescription>
                  이메일과 비밀번호를 입력해주세요
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form
                    onSubmit={form.handleSubmit(handleCredentialsSubmit)}
                    className="space-y-4"
                  >
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>이메일</FormLabel>
                          <FormControl>
                            <Input
                              type="email"
                              placeholder="user@example.com"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>비밀번호</FormLabel>
                          <FormControl>
                            <Input
                              type="password"
                              placeholder="최소 8자 이상"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="confirmPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>비밀번호 확인</FormLabel>
                          <FormControl>
                            <Input
                              type="password"
                              placeholder="비밀번호를 다시 입력하세요"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {errorMessage && (
                      <p
                        className="text-sm text-red-500"
                        role="alert"
                        aria-live="polite"
                      >
                        {errorMessage}
                      </p>
                    )}

                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          등록 중...
                        </>
                      ) : (
                        "다음"
                      )}
                    </Button>
                  </form>
                </Form>
              </CardContent>
              <CardFooter>
                <p className="text-xs text-slate-500">
                  이미 계정이 있으신가요?{" "}
                  <Link
                    href="/login"
                    className="font-medium text-slate-700 underline hover:text-slate-900"
                  >
                    로그인으로 이동
                  </Link>
                </p>
              </CardFooter>
            </Card>
          </div>
        )}

        {/* Step 2: 역할 선택 */}
        {currentStep === "role" && (
          <div className="flex flex-col gap-4">
            <Card>
              <CardHeader>
                <CardTitle>역할 선택</CardTitle>
                <CardDescription>
                  사용하실 서비스를 선택해주세요
                </CardDescription>
              </CardHeader>
              <CardContent>
                <RadioGroup
                  value={selectedRole ?? ""}
                  onValueChange={(value) =>
                    setSelectedRole(value as "advertiser" | "influencer")
                  }
                  className="space-y-4"
                >
                  {/* 광고주 옵션 */}
                  <div
                    className={`cursor-pointer rounded-lg border-2 p-4 transition-colors ${
                      selectedRole === "advertiser"
                        ? "border-blue-500 bg-blue-50"
                        : "border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <RadioGroupItem
                        value="advertiser"
                        id="advertiser"
                        className="mt-1"
                      />
                      <Label
                        htmlFor="advertiser"
                        className="flex flex-col gap-1 cursor-pointer flex-1"
                      >
                        <span className="font-semibold text-slate-900">
                          광고주
                        </span>
                        <span className="text-sm text-slate-500">
                          체험단을 등록하고 인플루언서를 선정합니다
                        </span>
                      </Label>
                    </div>
                  </div>

                  {/* 인플루언서 옵션 */}
                  <div
                    className={`cursor-pointer rounded-lg border-2 p-4 transition-colors ${
                      selectedRole === "influencer"
                        ? "border-blue-500 bg-blue-50"
                        : "border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <RadioGroupItem
                        value="influencer"
                        id="influencer"
                        className="mt-1"
                      />
                      <Label
                        htmlFor="influencer"
                        className="flex flex-col gap-1 cursor-pointer flex-1"
                      >
                        <span className="font-semibold text-slate-900">
                          인플루언서
                        </span>
                        <span className="text-sm text-slate-500">
                          체험단에 지원하고 리뷰를 작성합니다
                        </span>
                      </Label>
                    </div>
                  </div>
                </RadioGroup>

                {errorMessage && (
                  <p
                    className="mt-4 text-sm text-red-500"
                    role="alert"
                    aria-live="polite"
                  >
                    {errorMessage}
                  </p>
                )}
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button
                  variant="outline"
                  onClick={handleBackToCredentials}
                  disabled={isSubmitting}
                >
                  이전
                </Button>
                <Button
                  onClick={handleRoleSubmit}
                  disabled={!selectedRole || isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      진행 중...
                    </>
                  ) : (
                    "다음"
                  )}
                </Button>
              </CardFooter>
            </Card>
          </div>
        )}

        {/* 우측 이미지 */}
        <figure className="overflow-hidden rounded-xl border border-slate-200">
          <Image
            src="https://picsum.photos/seed/signup/640/640"
            alt="회원가입"
            width={640}
            height={640}
            className="h-full w-full object-cover"
            priority
          />
        </figure>
      </div>
    </div>
  );
}
