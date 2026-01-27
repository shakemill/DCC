export default function SectionTitle({ text1, text2, text3 }) {
    return (
        <>
            {text1 && (
                <p className="text-center font-medium text-[#f49d1d] dark:text-[#f5b84d] mt-28 px-10 py-2 rounded-full bg-slate-50 dark:bg-white border border-slate-300 dark:border-slate-700 w-max mx-auto">{text1}</p>
            )}
            <h3 className="text-3xl font-semibold text-center mx-auto mt-4">{text2}</h3>
            <p className="text-slate-600 dark:text-slate-300 text-center mt-2 max-w-lg mx-auto">{text3}</p>
        </>
    );
}