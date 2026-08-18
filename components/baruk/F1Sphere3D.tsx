"use client";

import {
    useEffect,
    useState,
} from "react";

import "./F1Sphere3D.css";

type SphereRarity =
    | "common"
    | "rare"
    | "epic"
    | "legendary";

type F1Sphere3DProps = {
    number: number;

    teamName: string;

    teamSlug?:
    | string
    | null;

    season?:
    | number
    | null;

    rarity?:
    | SphereRarity
    | null;

    primaryColor?:
    | string
    | null;

    secondaryColor?:
    | string
    | null;

    accentColor?:
    | string
    | null;

    carImageUrl?:
    | string
    | null;

    obtained: boolean;

    ownedCount: number;
};

function makeSlug(
    value: string
) {
    return value
        .toLowerCase()
        .normalize("NFD")
        .replace(
            /[\u0300-\u036f]/g,
            ""
        )
        .replace(
            /[^a-z0-9]+/g,
            "-"
        )
        .replace(
            /^-|-$/g,
            ""
        );
}

export default function F1Sphere3D({
    teamName,
    teamSlug,
    obtained,
    ownedCount,
}: F1Sphere3DProps) {

    const slug =
        teamSlug ??
        makeSlug(
            teamName
        );

    const imageSrc =
        `/assets/f1-cards/${slug}.webp`;

    const [
        imageError,
        setImageError,
    ] =
        useState(false);

    useEffect(
        () => {
            setImageError(
                false
            );
        },
        [
            imageSrc,
        ]
    );

    return (
        <article
            className={`
                f1-static-card

                ${obtained
                    ? "is-obtained"
                    : "is-locked"
                }
            `}
        >

            <div className="f1-static-card-frame">

                {/* =========================================
                    TARJETA COMPLETA
                    esfera + logo + marca + número
                ========================================== */}

                {!imageError ? (

                    <img
                        src={
                            imageSrc
                        }
                        alt={
                            `F1 Sphere ${teamName}`
                        }
                        draggable={
                            false
                        }
                        onError={
                            () =>
                                setImageError(
                                    true
                                )
                        }
                        className="f1-static-card-art"
                    />

                ) : (

                    /*
                     * Mientras todavía no hayamos creado
                     * el arte completo de esa escudería.
                     */
                    <div className="f1-static-card-fallback">

                        <div className="f1-static-fallback-top">
                            <span>
                                2026 · F1 SPHERE
                            </span>
                        </div>

                        <div className="f1-static-fallback-sphere">
                            <span>
                                ?
                            </span>
                        </div>

                        <div className="f1-static-fallback-brand">
                            {
                                teamName
                            }
                        </div>

                    </div>

                )}

                {/* =========================================
                    ESFERA APAGADA
                    No tapa logo ni nombre.
                ========================================== */}

                {!obtained &&
                    !imageError && (

                        <div
                            className="f1-static-lock-sphere"
                            aria-hidden="true"
                        >

                            <span>
                                ?
                            </span>

                        </div>

                    )}

                {/* DUPLICADAS */}

                {obtained &&
                    ownedCount >
                    1 && (

                        <div className="f1-static-owned-count">
                            x
                            {
                                ownedCount
                            }
                        </div>

                    )}

            </div>

        </article>
    );
}