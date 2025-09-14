import { ChevronDownIcon, ChevronUpIcon } from "@heroicons/react/16/solid";
import { Bars3BottomLeftIcon, Bars3BottomRightIcon, Bars3Icon, Bars4Icon, PencilIcon } from "@heroicons/react/24/outline";
import clsx from "clsx";
import { useEffect, useState } from "react";
import { LuEllipsisVertical, LuHighlighter } from "react-icons/lu";
import { MdChecklist, MdFormatBold, MdFormatClear, MdFormatColorText, MdFormatIndentDecrease, MdFormatIndentIncrease, MdFormatItalic, MdFormatLineSpacing, MdFormatListBulleted, MdFormatListNumbered, MdFormatUnderlined, MdInsertLink, MdOutlineAddComment, MdOutlineFormatPaint, MdOutlineInsertPhoto, MdOutlinePrint, MdRedo, MdSearch, MdSpellcheck, MdTranslate, MdUndo } from "react-icons/md";

type Props = {
    zoom: number,
    setZoom: (v: number) => void,
    fontFamily: 'serif' | 'sans',
    setFontFamily: (v: 'serif' | 'sans') => void,
    fontSize: number,
    setFontSize: (v: number) => void,
    bold: boolean,
    setBold: (v: boolean) => void,
    italic: boolean,
    setItalic: (v: boolean) => void,
    underline: boolean,
    setUnderline: (v: boolean) => void,
    align: 'left' | 'center' | 'right' | 'justify',
    setAlign: (v: 'left' | 'center' | 'right' | 'justify') => void,
};

export default function Toolbar(props: Props) {
    const {
        zoom, setZoom,
        fontFamily, setFontFamily,
        fontSize, setFontSize,
        bold, setBold,
        italic, setItalic,
        underline, setUnderline,
        align, setAlign,
    } = props;

    const [openZoomOption, setOpenZoomOption] = useState(false);
    const [zoomInput, setZoomInput] = useState(String(Math.round(zoom * 100)));
    const [openFontOption, setOpenFontOption] = useState(false);
    const [openTextAliginOption, setOpenTextAliginOption] = useState(false);

    const toHalfWidthNumber = (str: string) => {
        return str.replace(/[０-９]/g, (s) =>
            String.fromCharCode(s.charCodeAt(0) - 0xFEE0)
        );
    };

    const buttonLayout1 = "size-7 aspect-square flex items-center justify-center hover:bg-blue-200 rounded";
    const buttonLayout2 = "size-7 aspect-square flex items-center justify-center rounded";

    const buttonGroup1 = [
        { id: 'search', icon: MdSearch, label: 'Search the menus' },
        { id: 'undo', icon: MdUndo, label: 'Undo' },
        { id: 'redo', icon: MdRedo, label: 'Redo' },
        { id: 'print', icon: MdOutlinePrint, label: 'Print' },
        { id: 'spellGrammarCheck', icon: MdSpellcheck, label: 'Spellig and gramer check' },
        { id: 'formatPainter', icon: MdOutlineFormatPaint, label: 'Paint format' },
    ];

    const buttonGroup2 = [
        { id: 'bold', state: bold, onClick: () => setBold(!bold), icon: MdFormatBold, label: 'Bold' },
        { id: 'italic', state: italic, onClick: () => setItalic(!italic), icon: MdFormatItalic, label: 'Italic' },
        { id: 'underline', state: underline, onClick: () => setUnderline(!underline), icon: MdFormatUnderlined, label: 'Underline' },
        { id: 'textColor', icon: MdFormatColorText, label: 'Text color' },
        { id: 'bgColor', icon: LuHighlighter, label: 'Highlight color' },
    ];

    const buttonGroup3 = [
        { id: 'insertLink', icon: MdInsertLink, label: 'Insert link' },
        { id: 'insertComment', icon: MdOutlineAddComment, label: 'Add comment' },
        { id: 'insertImage', icon: MdOutlineInsertPhoto, label: 'Insert image' },
    ];
    const buttonGroup4 = [
        { id: 'lineSpacingMenu', icon: MdFormatLineSpacing, label: 'Line & paragraph spacing', chevron: true },
        { id: 'addChecklist', icon: MdChecklist, label: 'Checklist menu', chevron: false },
        { id: 'addBullet', icon: MdFormatListBulleted, label: 'Bulleted list', chevron: true },
        { id: 'addNumberedBullet', icon: MdFormatListNumbered, label: 'Numbered list', chevron: true },
        { id: 'outdent', icon: MdFormatIndentDecrease, label: 'Decrease indent', chevron: false },
        { id: 'indent', icon: MdFormatIndentIncrease, label: 'Increase indent', chevron: false },
        { id: 'inputToolsToggleButton', icon: MdFormatClear, label: 'Input tools', chevron: false },
    ];

    const zoomOptions = [50, 75, 90, 100, 125, 150, 200];
    useEffect(() => {
        setZoomInput(String(Math.round(zoom * 100)));
    }, [zoom]);
    const applyZoom = () => {
        let halfWidth = toHalfWidthNumber(zoomInput);

        let val = Number(halfWidth);
        if (isNaN(val)) return;

        if (val < 50) val = 50;
        if (val > 200) val = 200;

        setZoom(val / 100);
        setZoomInput(String(val));
    };

    const fontFamilyOptions = ["sans", "serif"] as const;

    const textAliginOptions = [
        { pos: 'left', icon: Bars3BottomLeftIcon },
        { pos: 'center', icon: Bars3Icon },
        { pos: 'right', icon: Bars3BottomRightIcon },
        { pos: 'justify', icon: Bars4Icon },
    ] as const;

    const chevronLayout = "w-4 aspect-square";

    return (
        <div className="mx-4 my-1.5 rounded-full px-4 h-10 flex items-center gap-[1px] bg-blue-100 ">
            {buttonGroup1.map(({ id, icon: Icon, label }) => (
                <button
                    key={id}
                    className={buttonLayout1}
                    title={label}
                >
                    <Icon />
                </button>
            ))}

            {/* ズーム設定 */}
            <div className="relative my-1 w-18 text-sm flex">
                <input
                    type="number"
                    min={50}
                    max={200}
                    className={`w-full min-w-8 rounded px-1 py-px text-left cursor-pointer ${openZoomOption && "bg-blue-200"}`}
                    value={zoomInput}
                    onChange={(e) => setZoomInput(e.target.value)}
                    onBlur={applyZoom}
                    onFocus={() => setOpenZoomOption(!openZoomOption)}
                    onKeyDown={(e) => {
                        if (e.key === "Enter") {
                            applyZoom();
                            e.currentTarget.blur();
                        }
                        setOpenZoomOption(!openZoomOption)
                    }}
                />
                <button
                    type="button"
                    className="flex items-center ml-1"
                    onClick={() => setOpenZoomOption(!openZoomOption)}
                >
                    <span className="px-1">%</span>
                    {
                        openZoomOption
                            ? <ChevronUpIcon className={chevronLayout} />
                            : <ChevronDownIcon className={chevronLayout} />
                    }
                </button>
                {openZoomOption && (
                    <ul className="absolute z-10 top-8 mt-1 w-full bg-white rounded shadow">
                        {zoomOptions.map(opt => (
                            <li
                                key={opt}
                                className="px-2 py-1 hover:bg-blue-100 cursor-pointer"
                                onClick={() => {
                                    setZoom(opt / 100);
                                    setOpenZoomOption(false);
                                }}
                            >
                                {opt}%
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            <div className="w-px h-5 mx-1 bg-slate-600" />

            {/* フォント選択 */}
            <div className="relative my-1 w-28 text-sm flex">
                <input
                    type="text"
                    className={`w-full rounded px-1 py-px text-left cursor-pointer ${openFontOption && "bg-blue-200"}`}
                    value={fontFamily}
                    readOnly
                    onClick={() => setOpenFontOption(!openFontOption)}
                />
                <button
                    type="button"
                    className="flex items-center ml-1"
                    onClick={() => setOpenFontOption(!openFontOption)}
                >
                    {openFontOption
                        ? <ChevronUpIcon className={chevronLayout} />
                        : <ChevronDownIcon className={chevronLayout} />
                    }
                </button>

                {openFontOption && (
                    <ul className="absolute z-10 top-8 mt-1 w-full bg-white rounded shadow">
                        {fontFamilyOptions.map(opt => (
                            <li
                                key={opt}
                                className="px-2 py-1 hover:bg-blue-100 cursor-pointer"
                                onClick={() => {
                                    setFontFamily(opt);
                                    setOpenFontOption(false);
                                }}
                            >
                                {opt}
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            <div className="w-px h-5 mx-1 bg-slate-600" />

            {/* フォントサイズ */}
            <div className="items-center text-xs  hidden sm:flex">
                <button
                    onClick={() => {
                        if (fontSize > 1) {
                            setFontSize(fontSize - 1);
                        }
                    }}
                    className={buttonLayout1}
                >
                    −
                </button>
                <input
                    type="text"
                    className="w-8 p-1 mx-1 border rounded flex text-center"
                    value={fontSize}
                    onChange={(e) => {
                        setFontSize(Number(toHalfWidthNumber(e.target.value)) || 0);
                    }}
                    onBlur={() => {
                        let val = Number(toHalfWidthNumber(String(fontSize)));
                        if (isNaN(val)) return;
                        if (val < 1) val = 1;
                        if (val > 400) val = 400;
                        setFontSize(val);
                    }}
                    onKeyDown={(e) => {
                        if (e.key === "Enter") {
                            let val = Number(toHalfWidthNumber(String(fontSize)));
                            if (isNaN(val)) return;
                            if (val < 1) val = 1;
                            if (val > 400) val = 400;
                            setFontSize(val);
                            e.currentTarget.blur();
                        }
                    }}
                />
                <button
                    onClick={() => {
                        if (fontSize < 400) {
                            setFontSize(fontSize + 1);
                        }
                    }}
                    className={buttonLayout1}
                >
                    ＋
                </button>
            </div>

            <div className="w-px h-5 mx-1 bg-slate-600 hidden sm:flex" />

            {/* スタイルボタン */}
            {buttonGroup2.map(({ id, state, onClick, icon: Icon, label }) => (
                <button
                    key={id}
                    className={clsx(
                        buttonLayout2,
                        "hidden md:flex",
                        state ? 'bg-blue-200' : 'hover:bg-blue-200',
                    )}
                    title={label}
                    onClick={onClick}
                >
                    <Icon />
                </button>
            ))}

            <div className="w-px h-5 mx-1 bg-slate-600 hidden md:flex" />

            {buttonGroup3.map(({ id, icon: Icon, label }) => (
                <button
                    key={id}
                    className={clsx(
                        buttonLayout1,
                        "hidden lg:flex"
                    )}
                    title={label}
                >
                    <Icon />
                </button>
            ))}

            <div className="w-px h-5 mx-1 bg-slate-600 hidden lg:flex" />

            {/* 配置 */}
            <div className="relative hidden xl:flex">
                <button
                    type="button"
                    className={clsx(
                        "h-8 p-1 flex items-center rounded hover:bg-blue-200",
                        openTextAliginOption && "bg-blue-200"
                    )}
                    onClick={() => setOpenTextAliginOption(!openTextAliginOption)}
                >
                    {(() => {
                        const current = textAliginOptions.find(opt => opt.pos === align)
                        if (!current) return null
                        const Icon = current.icon
                        return <Icon className="w-4 h-4" />
                    })()}
                    {openTextAliginOption
                        ? <ChevronUpIcon className={chevronLayout} />
                        : <ChevronDownIcon className={chevronLayout} />}
                </button>

                {openTextAliginOption && (
                    <ul className="absolute z-10 mt-1 p-1 bg-white rounded shadow flex">
                        {textAliginOptions.map(opt => {
                            const Icon = opt.icon
                            return (
                                <li key={opt.pos}>
                                    <button
                                        className={`p-2 hover:bg-blue-100 ${opt.pos === align && "bg-blue-200"}`}
                                        onClick={() => {
                                            setAlign(opt.pos)
                                            setOpenTextAliginOption(false)
                                        }}
                                    >
                                        <Icon className="w-4 h-4" />
                                    </button>
                                </li>
                            )
                        })}
                    </ul>
                )}
            </div>

            {/* その他アイコン */}
            {buttonGroup4.map(({ id, icon: Icon, chevron, label }) => (
                <button
                    key={id}
                    className={"hover:bg-blue-200 rounded hidden xl:flex"}
                    title={label}
                >
                    <div className={buttonLayout2}>
                        <Icon />
                    </div>
                    {chevron && <ChevronDownIcon className={chevronLayout} />}
                </button>
            ))}
            <div className="w-px h-5 mx-1 bg-slate-600 hidden xl:flex" />
            <button
                key="inputToolsToggleButton"
                className={"hover:bg-blue-200 rounded hidden 2xl:flex"}
                title="Input tools"
            >
                <div className={buttonLayout2}>
                    <MdTranslate />
                </div>
                <ChevronDownIcon className={chevronLayout} />
            </button>
            <button
                key={"more"}
                className={clsx(
                    buttonLayout1,
                    "2xl:hidden",
                )}
                title={"More"}
            >
                <LuEllipsisVertical className="size-4" />
            </button>

            <div className="flex items-center ml-auto">
                <button
                    key="modeSwitcher"
                    className={"flex hover:bg-blue-200 rounded"}
                    title="Editing mode"
                >
                    <div className={buttonLayout2}>
                        <PencilIcon className="size-4" />
                    </div>
                    <ChevronDownIcon className={chevronLayout} />
                </button>
                <div className="w-px h-5 mx-1 bg-slate-600" />

                <button
                    key={"viewModeB"}
                    className={buttonLayout1}
                    title={"Hide the menus"}
                >
                    <ChevronUpIcon className="size-4" />
                </button>
            </div>
        </div>
    )
};
