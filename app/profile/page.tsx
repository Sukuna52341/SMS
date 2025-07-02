import Navbar from "@/components/navbar";

export default function ProfileComingSoon() {
  return (
    <>
      <Navbar />
      <div className="flex flex-col items-center justify-center min-h-screen">
        <h1 className="text-3xl font-bold mb-4">Profile Page</h1>
        <p className="text-lg text-gray-600">Coming Soon!</p>
      </div>
    </>
  );
}