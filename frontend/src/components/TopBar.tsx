import { ChevronDownIcon, ChevronUpIcon, GlobeAsiaAustraliaIcon } from "@heroicons/react/16/solid";
import clsx from "clsx";
import { useEffect, useRef, useState } from "react";
import { LuLockKeyhole } from "react-icons/lu";
import { MdInsertLink } from "react-icons/md";

type Props = {
    title: string
    onTitleChange: (v: string) => void
    zoom: number
    onZoomChange: (v: number) => void
    onShareClick?: () => void;
};

export default function TopBar({ title, onTitleChange, zoom, onZoomChange, onShareClick, }: Props) {
    const spanRef = useRef<HTMLSpanElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const [inputWidth, setInputWidth] = useState(0);
    const [shrDlgOpen, setShrDlgOpen] = useState(false);
    const [accessLevel, setAccessLevel] = useState<'restricted' | 'anyone'>('restricted');
    const [role, setRole] = useState<'viewer' | 'commenter' | 'editor'>('editor');
    const [openCopyLinkOption, setOpenCopyLinkOption] = useState(false);

    useEffect(() => {
        if (spanRef.current) {
            setInputWidth(spanRef.current.offsetWidth + 8);
        };
    }, [title]);

    const inputClassName = "px-1.5 py-[1px] rounded text-[18px] font-normal leading-[16px] hover:bg-slate-200 focus:bg-white focus:ring-2 focus:ring-blue-300 min-w-0 max-w-[calc(100%-1rem)] overflow-hidden text-ellipsis whitespace-nowrap";
    const toolList = ["File", "Edit", "View", "Insert", "Format", "Tools", "Extensions", "Help"];
    const splitButtonLayout = "px-3 py-2.5 bg-blue-200 hover:bg-blue-300 active:bg-blue-400 text-xs font-[500] flex items-center h-[36px]";

    const chevronLayout = "mr-1 w-2";

    return (
        <header className="min-w-screen h-13 flex items-center bg-white/90">
            <div className="h-[36px] aspect-square m-y-auto ml-4 mr-2 rounded grid place-items-center bg-blue-600 text-white font-bold">E</div>
            <div className="flex flex-col py-2 min-w-0">
                <input
                    style={{ width: `${inputWidth}px` }}
                    className={inputClassName}
                    value={title}
                    onChange={(e) => onTitleChange(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === "Enter") {
                            e.currentTarget.blur();
                            if (title.trim().length === 0) {
                                onTitleChange("Untitled document");
                            }
                        }
                    }}
                    onBlur={() => {
                        if (title.trim().length === 0) {
                            onTitleChange('Untitled document')
                        }
                    }}
                />
                <span
                    ref={spanRef}
                    className={clsx(
                        "absolute invisible whitespace-pre",
                        inputClassName,
                    )}
                >
                    {title}
                </span>
                <div className="flex flex-nowrap overflow-x-hidden">
                    {toolList.map((title) => (
                        <button key={title} className={"text-xs leading-[12px] font-medium px-2 py-1 rounded hover:bg-gray-200 whitespace-nowrap truncate"}>{title}</button>
                    ))}
                </div>
            </div>
            <div className="ml-auto pl-4 pr-3 flex items-center gap-2 shrink-0">

                <div className="flex gap-px">
                    <button
                        className={clsx(
                            splitButtonLayout,
                            "rounded-l-full",
                        )}
                        onClick={() => setShrDlgOpen(true)}
                    >
                        {accessLevel === "anyone"
                            ? <GlobeAsiaAustraliaIcon className="ml-1.5 mr-2 size-4" />
                            : <LuLockKeyhole className="ml-1.5 mr-2 size-4" />
                        }
                        <span>Share</span>
                    </button>

                    <div className={"relative"}>
                        <button
                            type="button"
                            className={clsx(
                                splitButtonLayout,
                                "rounded-r-full",
                            )}
                            onClick={() => setOpenCopyLinkOption(!openCopyLinkOption)}
                        >
                            {openCopyLinkOption
                                ? <ChevronUpIcon className={chevronLayout} />
                                : <ChevronDownIcon className={chevronLayout} />}
                        </button>

                        {openCopyLinkOption && (
                            <ul className="absolute z-10 top-8 right-0 mt-1 min-w-[240px] bg-white rounded shadow">
                                <li
                                    onClick={() => {
                                        setOpenCopyLinkOption(false)
                                    }}
                                    className="my-2 px-3 py-1 hover:bg-blue-100 cursor-pointer flex items-center text-sm font-normal leading-[18px]"
                                >
                                    <MdInsertLink className="mr-2 mt-0.5 size-4" />
                                    Copy Link
                                </li>
                                <div className="w-full h-px bg-slate-300" />
                                <li className="m-4 text-xs font-normal  leading-[14px] text-slate-600 ">
                                    {accessLevel === "anyone"
                                        ?
                                        <>
                                            <span className="text-sm font-medium">Public on the web</span>
                                            <div className="">Anyone on the Internet with the link can open</div>
                                        </>
                                        : "Private to only me"}
                                </li>
                            </ul>
                        )}
                    </div>
                </div>
                <div className="size-12 aspect-square p-2">
                    <div className="aspect-square rounded-full bg-emerald-500 text-white grid place-items-center">Y</div>
                </div>
            </div>

            {/* Dialog */}

            {shrDlgOpen && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
                    onClick={(e) => {
                        if (e.target === e.currentTarget) {
                            setShrDlgOpen(false);
                        }
                    }}
                >
                    <div
                        className="w-full max-w-[640px] bg-white rounded-lg shadow-xl"
                        onMouseDown={(e) => e.stopPropagation()}
                    >
                        {/* ヘッダー */}
                        <div className="h-14 w-full px-6 pt-4">
                            <h2 className="text-xl font-normal text-slate-900">
                                Share "{title}"
                            </h2>
                        </div>

                        {/* 本文 */}
                        <div className="pt-4">

                            <div className="flex px-6">
                                <input
                                    ref={inputRef}
                                    type="text"
                                    placeholder="Add people, groups, add calencar events"
                                    className="flex-1 h-12 rounded border border-slate-500 px-3 outline-none focus:border-[#1a73e8]"
                                />
                            </div>

                            {/* <div className="flex flex-col">
                                <div className="text-base font-medium pt-4 pl-6">People with access</div>
                                <div className="flex flex-row justify-center items-center pl-4 pr-6 py-2 hover:bg-slate-100">
                                    <div className="ml-2 mr-3">
                                        <div className="size-8 aspect-square rounded-full bg-emerald-500 text-white grid place-items-center">K</div>
                                    </div>
                                    <div className="flex flex-col w-full">
                                        <span className="text-sm font-medium leading-[20px]">Yudai Ishikawa(you)</span>
                                        <span className="text-xs font-normal leading-[16px]">xxxyyyzzz@aaa.com</span>
                                    </div>
                                    <span className="text-sm font-normal leading-[24px] text-slate-400">Owner</span>
                                </div>
                            </div> */}

                            <div className="flex flex-col">
                                <div className="text-base font-medium pt-4 pl-6">General access</div>
                                <div className="flex flex-row justify-center items-center pl-4 pr-6 py-2 hover:bg-slate-100">
                                    <div className="ml-2 mr-3">
                                        <div className={clsx(
                                            "size-8 aspect-square rounded-full grid place-items-center",
                                            accessLevel === "anyone"
                                                ? "bg-green-200 text-green-800"
                                                : "bg-gray-200 text-gray-800"
                                        )}>
                                            {accessLevel === "anyone"
                                                ? <GlobeAsiaAustraliaIcon className="size-4" />
                                                : <LuLockKeyhole className="size-4" />
                                            }
                                        </div>

                                    </div>
                                    <div className="flex flex-col w-full">
                                        <select
                                            value={accessLevel}
                                            onChange={(e) => setAccessLevel(e.target.value as 'restricted' | 'anyone')}
                                            className="text-sm font-medium leading-[20px] focus:outline-none w-[160px] hover:bg-slate-200 active:bg-slate-300"
                                        >
                                            <option value="restricted">Restricted</option>
                                            <option value="anyone">Anyone with the link</option>
                                        </select>
                                        <span className="text-xs font-normal leading-[16px]">
                                            {accessLevel === "anyone"
                                                ? `Anyone on the internet with the link can ${role === "viewer" ? "view" : role === "commenter" ? "comment" : "edit"}`
                                                : "Only people with access can open with the link"
                                            }
                                        </span>
                                    </div>
                                    {accessLevel === "anyone" &&
                                        <select
                                            value={role}
                                            onChange={(e) => setRole(e.target.value as "viewer" | "commenter" | "editor")}
                                            className="text-sm font-normal leading-[20px] focus:outline-none w-[144px] hover:bg-slate-200 active:bg-slate-300"
                                        >
                                            <option value="viewer">Viewer</option>
                                            <option value="commenter">Commenter</option>
                                            <option value="editor">Editor</option>
                                        </select>}
                                </div>
                            </div>
                        </div>

                        {/* フッター */}
                        <div className="p-6 flex justify-between">
                            <button
                                onClick={() => setShrDlgOpen(false)}
                                className="pl-4 pr-6 py-2 flex flex-row items-center rounded-full border text-blue-600 hover:bg-blue-50 active:bg-blue-100"
                            >
                                <MdInsertLink className="size-4.5 mr-2" />
                                <span className="text-sm font-medium leading-[18px]">Copy link</span>
                            </button>

                            <button
                                onClick={() => setShrDlgOpen(false)}
                                className="px-6 py-2 items-center rounded-full border text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800"
                            >
                                <span className="text-sm font-medium leading-[18px]">Done</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </header >
    )
};
