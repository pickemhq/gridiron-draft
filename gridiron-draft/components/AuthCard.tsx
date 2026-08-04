import Link from "next/link";

export default function AuthCard({
  title,
  footerHref,
  footerText,
  children,
}: {
  title: string;
  footerHref: string;
  footerText: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-sm px-6 py-20">
      <h1 className="font-display text-2xl uppercase text-chalk mb-6">{title}</h1>
      <div className="border border-field-700 bg-field-900/60 rounded-md p-6">{children}</div>
      <Link href={footerHref} className="block mt-4 text-sm text-chalk/60 hover:text-chalk underline underline-offset-4">
        {footerText}
      </Link>
    </div>
  );
}
