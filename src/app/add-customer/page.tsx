
'use client';
import { useState, useMemo, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CustomerForm } from './customer-form';
import QRCode from 'qrcode.react';
import { Printer, CheckCircle, QrCode } from 'lucide-react';
import { useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Company } from '@/lib/types';

export default function AddCustomerPage() {
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [qrCodeValue, setQrCodeValue] = useState('');

    const firestore = useFirestore();
    const companyDocRef = useMemoFirebase(() => firestore ? doc(firestore, 'settings', 'global', 'companies', 'main_company') : null, [firestore]);
    const { data: companyDetails } = useDoc<Company>(companyDocRef);

    const handlePrintPage = () => {
        document.body.classList.remove('print-qr-only');
        window.print();
    }

    const handlePrintQrCode = () => {
        document.body.classList.add('print-qr-only');
        window.print();
        setTimeout(() => document.body.classList.remove('print-qr-only'), 500);
    }
    
    useEffect(() => {
        if(typeof window !== "undefined") {
            setQrCodeValue(window.location.href);
        }
    }, []);

    return (
        <>
            <div className="flex items-center justify-center min-h-screen bg-muted/40 p-4 sm:p-6 md:p-8 print:p-0 print:m-0 print:bg-white">
                <Card className="w-full max-w-2xl mx-auto print:shadow-none print:border-none print:rounded-none print:w-full print:h-full print:max-w-none print:flex print:flex-col">
                    <CardHeader className="print:pb-2 print-hide-on-qr">
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 print:flex-row">
                            <div className="text-center sm:text-left">
                                <CardTitle className="text-3xl print:text-2xl">{companyDetails?.name || 'Customer Registration'}</CardTitle>
                                <CardDescription className="print:hidden">Scan the QR code or fill out the form to register.</CardDescription>
                            </div>
                            <div className="flex items-center gap-2 print:hidden">
                                <Button onClick={handlePrintQrCode} variant="outline">
                                    <QrCode className="mr-2 h-4 w-4" />
                                    Print QR Code
                                </Button>
                                <Button onClick={handlePrintPage} variant="outline">
                                    <Printer className="mr-2 h-4 w-4" />
                                    Print Page
                                </Button>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-8 print:gap-4 print:p-4 print:flex-1 print:h-full print:flex-col">
                        <div className="w-full qr-section-print-hide print:flex-1">
                        {isSubmitted ? (
                            <div className="flex flex-col items-center justify-center h-full text-center p-8 bg-green-50 rounded-lg">
                                    <CheckCircle className="h-16 w-16 text-green-600 mb-4" />
                                    <h3 className="text-xl font-bold text-green-800">Registration Complete!</h3>
                                    <p className="text-muted-foreground mt-2">
                                        Thank you. Your details have been submitted for approval.
                                    </p>
                                </div>
                        ) : (
                                <CustomerForm setIsSubmitted={setIsSubmitted} />
                        )}
                        </div>
                        <div id="qr-code-section" className="flex-shrink-0 flex flex-col items-center gap-4 p-6 border rounded-lg bg-background print:border-none print:p-0 print:bg-transparent print:pt-8">
                            <CardTitle className="hidden print:block print:text-2xl print-show-on-qr">{companyDetails?.name || 'Customer Registration'}</CardTitle>
                            <h3 className="font-semibold text-center print:hidden">Scan to Register</h3>
                            {qrCodeValue ? (
                                <QRCode value={qrCodeValue} size={160} />
                            ) : (
                                <div className="h-[160px] w-[160px] bg-muted rounded-md animate-pulse"></div>
                            )}
                            <p className="text-xs text-muted-foreground text-center max-w-[160px] print:text-black">Point your camera here to open this form on your mobile device.</p>
                        </div>
                    </CardContent>
                </Card>
            </div>
             <style jsx global>{`
                @media print {
                    @page {
                        size: A4;
                        margin: 0;
                    }
                    html, body {
                        width: 100%;
                        height: 100%;
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                        overflow: hidden;
                    }
                    body > div:first-child {
                        display: block !important;
                    }
                    body.print-qr-only {
                        display: flex;
                        align-items: flex-start;
                        justify-content: center;
                    }
                    body.print-qr-only > div:first-child {
                        min-height: unset !important;
                    }
                    body.print-qr-only .qr-section-print-hide,
                    body.print-qr-only .print-hide-on-qr {
                        display: none !important;
                    }
                    body.print-qr-only #qr-code-section {
                        display: flex !important;
                        margin: 2rem auto 0 auto;
                        padding: 0 !important;
                        text-align: center;
                    }
                    body:not(.print-qr-only) .print-show-on-qr {
                        display: none !important;
                    }
                }
            `}</style>
        </>
    );
}
