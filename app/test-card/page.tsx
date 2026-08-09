import BarukRevealCard from "@/components/baruk/BarukRevealCard";

export default function TestCardPage() {
    return (
        <main
            style={{
                minHeight: "100vh",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "#ffffff",
                padding: "40px 20px",
            }}
        >
            <BarukRevealCard
                cardId="76135da0-aac5-43db-b621-ea434ec96b0f"
                email="alexis@hotmail.com"
            />
        </main>
    );
}