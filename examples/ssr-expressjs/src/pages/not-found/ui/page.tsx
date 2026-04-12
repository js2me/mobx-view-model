export const NotFoundPage = () => {
  return (
    <main className="flex min-h-[60vh] w-full items-center justify-center bg-base-bg">
      <div className="flex flex-col items-center gap-6 text-center">
        <span className="font-bold text-[120px] text-gray-200 leading-none">
          404
        </span>
        <h1 className="font-semibold text-3xl text-gray-800">
          Страница не найдена
        </h1>
        <p className="max-w-md text-gray-500">
          К сожалению, запрашиваемая страница не существует или была перемещена.
        </p>
        <a
          href="/"
          className="mt-4 rounded-lg bg-brand px-6 py-3 text-white transition-opacity hover:opacity-85"
        >
          Вернуться на главную
        </a>
      </div>
    </main>
  );
};
