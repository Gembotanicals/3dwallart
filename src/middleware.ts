import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: {
    signIn: "/login",
  },
});

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/editor/:path*",
    "/library/:path*",
    "/settings/:path*",
  ],
};
